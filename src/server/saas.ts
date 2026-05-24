import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';
export type OrganizationRole = 'owner' | 'member';

export interface SaasUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  organizationId: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface SaasOrganizationRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaasSubscriptionRecord {
  organizationId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  seats: number;
  aiMonthlyCredits: number;
  trialEndsAt?: string;
  currentPeriodEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningBackupSnapshot {
  app: 'english-training-cabin';
  schemaVersion: 1;
  exportedAt: string;
  data: {
    studyGoals: unknown[];
    practiceSessions: unknown[];
    attempts: unknown[];
    reviewItems: unknown[];
    skillProfiles: unknown[];
  };
}

export interface CloudLearningSnapshotRecord {
  organizationId: string;
  userId: string;
  backup: LearningBackupSnapshot;
  updatedAt: string;
}

export interface SaasDatabaseShape {
  schemaVersion: 1;
  users: SaasUserRecord[];
  organizations: SaasOrganizationRecord[];
  subscriptions: SaasSubscriptionRecord[];
  learningSnapshots: CloudLearningSnapshotRecord[];
}

export interface SaasAccountRecord {
  user: SaasUserRecord;
  organization: SaasOrganizationRecord;
  subscription: SaasSubscriptionRecord;
}

export interface SaasStore {
  kind: 'memory' | 'file';
  findUserByEmail(email: string): Promise<SaasUserRecord | undefined>;
  findUserById(userId: string): Promise<SaasUserRecord | undefined>;
  createAccount(input: {
    email: string;
    name: string;
    passwordHash: string;
    organizationName?: string;
  }): Promise<SaasAccountRecord>;
  updateUserLogin(userId: string, at: string): Promise<void>;
  getAccountForUser(userId: string): Promise<SaasAccountRecord | undefined>;
  saveLearningSnapshot(input: {
    organizationId: string;
    userId: string;
    backup: LearningBackupSnapshot;
  }): Promise<CloudLearningSnapshotRecord>;
  getLearningSnapshot(organizationId: string, userId: string): Promise<CloudLearningSnapshotRecord | undefined>;
}

export interface PublicSaasAccountContext {
  user: {
    id: string;
    email: string;
    name: string;
    role: OrganizationRole;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    seats: number;
    trialEndsAt?: string;
    currentPeriodEndsAt?: string;
  };
  entitlements: {
    cloudSync: boolean;
    aiMonthlyCredits: number;
    teamSeats: number;
    licensedContent: boolean;
    adminConsole: boolean;
  };
}

export interface SaasSessionPayload {
  iss: 'english-training-cabin';
  aud: 'english-training-cabin-web';
  sub: string;
  org: string;
  role: OrganizationRole;
  iat: number;
  exp: number;
}

export class SaasApiError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_MIN_LENGTH = 8;
const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

function createEmptyDatabase(): SaasDatabaseShape {
  return {
    schemaVersion: 1,
    users: [],
    organizations: [],
    subscriptions: [],
    learningSnapshots: [],
  };
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new SaasApiError(400, 'invalid_email', '请输入有效邮箱。');
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new SaasApiError(400, 'invalid_email', '请输入有效邮箱。');
  }
  return email;
}

function normalizeName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ') : '';
  if (name.length < 2 || name.length > 40) {
    throw new SaasApiError(400, 'invalid_name', '名称需为 2-40 个字符。');
  }
  return name;
}

function normalizeOrganizationName(value: unknown, fallbackName: string): string {
  const name = typeof value === 'string' ? value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ') : '';
  if (!name) return `${fallbackName}的英语训练舱`;
  if (name.length < 2 || name.length > 60) {
    throw new SaasApiError(400, 'invalid_organization_name', '团队名称需为 2-60 个字符。');
  }
  return name;
}

function assertPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH || value.length > 128) {
    throw new SaasApiError(400, 'weak_password', `密码至少 ${PASSWORD_MIN_LENGTH} 位。`);
  }
  return value;
}

function slugifyOrganization(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return normalized || `org-${crypto.randomUUID().slice(0, 8)}`;
}

function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function buildTrialSubscription(organizationId: string, now: string): SaasSubscriptionRecord {
  return {
    organizationId,
    tier: 'pro',
    status: 'trialing',
    seats: 1,
    aiMonthlyCredits: 1000,
    trialEndsAt: addDays(new Date(now), 14),
    createdAt: now,
    updatedAt: now,
  };
}

function buildEntitlements(subscription: SaasSubscriptionRecord): PublicSaasAccountContext['entitlements'] {
  const usable = subscription.status === 'trialing' || subscription.status === 'active';
  return {
    cloudSync: usable,
    aiMonthlyCredits: usable ? subscription.aiMonthlyCredits : 0,
    teamSeats: usable ? subscription.seats : 0,
    licensedContent: usable && (subscription.tier === 'team' || subscription.tier === 'enterprise'),
    adminConsole: usable && subscription.tier !== 'free',
  };
}

function createStoreFromDatabase(options: {
  kind: SaasStore['kind'];
  load?: () => Promise<SaasDatabaseShape>;
  persist?: (database: SaasDatabaseShape) => Promise<void>;
  initial?: SaasDatabaseShape;
}): SaasStore {
  let database = options.initial ?? createEmptyDatabase();
  let loaded = !options.load;
  let writeQueue = Promise.resolve();

  async function ensureLoaded() {
    if (loaded || !options.load) return;
    database = await options.load();
    loaded = true;
  }

  async function read<T>(reader: (db: SaasDatabaseShape) => T): Promise<T> {
    await ensureLoaded();
    return clone(reader(database));
  }

  async function mutate<T>(writer: (db: SaasDatabaseShape) => T): Promise<T> {
    await ensureLoaded();
    const result = writer(database);
    const clonedResult = clone(result);
    writeQueue = writeQueue.then(() => options.persist?.(database) ?? Promise.resolve());
    await writeQueue;
    return clonedResult;
  }

  return {
    kind: options.kind,
    findUserByEmail(email) {
      return read((db) => db.users.find((user) => user.email === email));
    },
    findUserById(userId) {
      return read((db) => db.users.find((user) => user.id === userId));
    },
    createAccount(input) {
      return mutate((db) => {
        if (db.users.some((user) => user.email === input.email)) {
          throw new SaasApiError(409, 'email_exists', '该邮箱已注册，请直接登录。');
        }

        const now = new Date().toISOString();
        const organizationId = crypto.randomUUID();
        const userId = crypto.randomUUID();
        const organizationName = input.organizationName ?? `${input.name}的英语训练舱`;
        const organization: SaasOrganizationRecord = {
          id: organizationId,
          name: organizationName,
          slug: slugifyOrganization(organizationName),
          createdAt: now,
          updatedAt: now,
        };
        const subscription = buildTrialSubscription(organizationId, now);
        const user: SaasUserRecord = {
          id: userId,
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
          organizationId,
          role: 'owner',
          createdAt: now,
          updatedAt: now,
        };

        db.organizations.push(organization);
        db.subscriptions.push(subscription);
        db.users.push(user);

        return { user, organization, subscription };
      });
    },
    updateUserLogin(userId, at) {
      return mutate((db) => {
        const user = db.users.find((item) => item.id === userId);
        if (user) {
          user.lastLoginAt = at;
          user.updatedAt = at;
        }
      });
    },
    getAccountForUser(userId) {
      return read((db) => {
        const user = db.users.find((item) => item.id === userId);
        if (!user) return undefined;
        const organization = db.organizations.find((item) => item.id === user.organizationId);
        const subscription = db.subscriptions.find((item) => item.organizationId === user.organizationId);
        if (!organization || !subscription) return undefined;
        return { user, organization, subscription };
      });
    },
    saveLearningSnapshot(input) {
      return mutate((db) => {
        const now = new Date().toISOString();
        const currentIndex = db.learningSnapshots.findIndex((snapshot) =>
          snapshot.organizationId === input.organizationId && snapshot.userId === input.userId,
        );
        const snapshot: CloudLearningSnapshotRecord = {
          organizationId: input.organizationId,
          userId: input.userId,
          backup: input.backup,
          updatedAt: now,
        };
        if (currentIndex >= 0) db.learningSnapshots[currentIndex] = snapshot;
        else db.learningSnapshots.push(snapshot);
        return snapshot;
      });
    },
    getLearningSnapshot(organizationId, userId) {
      return read((db) => db.learningSnapshots.find((snapshot) =>
        snapshot.organizationId === organizationId && snapshot.userId === userId,
      ));
    },
  };
}

export function createInMemorySaasStore(initial?: Partial<SaasDatabaseShape>): SaasStore {
  return createStoreFromDatabase({
    kind: 'memory',
    initial: {
      ...createEmptyDatabase(),
      ...initial,
      schemaVersion: 1,
    },
  });
}

function normalizeDatabaseShape(value: unknown): SaasDatabaseShape {
  const input = value && typeof value === 'object' ? value as Partial<SaasDatabaseShape> : {};
  return {
    schemaVersion: 1,
    users: Array.isArray(input.users) ? input.users : [],
    organizations: Array.isArray(input.organizations) ? input.organizations : [],
    subscriptions: Array.isArray(input.subscriptions) ? input.subscriptions : [],
    learningSnapshots: Array.isArray(input.learningSnapshots) ? input.learningSnapshots : [],
  };
}

export function createFileSaasStore(filePath: string): SaasStore {
  const resolvedPath = path.resolve(filePath);
  return createStoreFromDatabase({
    kind: 'file',
    async load() {
      try {
        const content = await fs.readFile(resolvedPath, 'utf8');
        return normalizeDatabaseShape(JSON.parse(content));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return createEmptyDatabase();
        }
        throw error;
      }
    },
    async persist(database) {
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      const tempPath = `${resolvedPath}.${process.pid}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(database, null, 2), 'utf8');
      await fs.rename(tempPath, resolvedPath);
    },
  });
}

export function getDefaultSaasDataFile() {
  return process.env.SAAS_DATA_FILE || path.join(process.cwd(), '.data', 'saas-store.json');
}

export function getSaasSessionSecret(): string | null {
  const explicit = process.env.SAAS_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === 'production') return null;
  return 'dev-only-english-training-cabin-session-secret';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, 'sha256').toString('base64url');
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [algorithm, iterationsText, salt, expectedHash] = passwordHash.split('$');
  if (algorithm !== 'pbkdf2_sha256' || !iterationsText || !salt || !expectedHash) return false;
  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 10_000) return false;
  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(actualHash);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function signTokenSegment(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

export function issueSessionToken(account: SaasAccountRecord, secret: string, now = Math.floor(Date.now() / 1000)): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: SaasSessionPayload = {
    iss: 'english-training-cabin',
    aud: 'english-training-cabin-web',
    sub: account.user.id,
    org: account.organization.id,
    role: account.user.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signTokenSegment(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

export function verifySessionToken(token: string, secret: string, now = Math.floor(Date.now() / 1000)): SaasSessionPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new SaasApiError(401, 'invalid_token', '登录状态无效，请重新登录。');
  }
  const [header, body, signature] = parts;
  const expectedSignature = signTokenSegment(`${header}.${body}`, secret);
  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new SaasApiError(401, 'invalid_token', '登录状态无效，请重新登录。');
  }

  let payload: Partial<SaasSessionPayload>;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<SaasSessionPayload>;
  } catch {
    throw new SaasApiError(401, 'invalid_token', '登录状态无效，请重新登录。');
  }
  if (
    payload.iss !== 'english-training-cabin' ||
    payload.aud !== 'english-training-cabin-web' ||
    typeof payload.sub !== 'string' ||
    typeof payload.org !== 'string' ||
    (payload.role !== 'owner' && payload.role !== 'member') ||
    typeof payload.exp !== 'number' ||
    payload.exp <= now
  ) {
    throw new SaasApiError(401, 'invalid_token', '登录状态已过期，请重新登录。');
  }

  return payload as SaasSessionPayload;
}

export async function registerSaasAccount(store: SaasStore, value: unknown): Promise<SaasAccountRecord> {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const email = normalizeEmail(input.email);
  const name = normalizeName(input.name);
  const password = assertPassword(input.password);
  const organizationName = normalizeOrganizationName(input.organizationName, name);
  return store.createAccount({
    email,
    name,
    organizationName,
    passwordHash: hashPassword(password),
  });
}

export async function loginSaasAccount(store: SaasStore, value: unknown): Promise<SaasAccountRecord> {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const email = normalizeEmail(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const user = await store.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new SaasApiError(401, 'invalid_credentials', '邮箱或密码不正确。');
  }
  await store.updateUserLogin(user.id, new Date().toISOString());
  const account = await store.getAccountForUser(user.id);
  if (!account) {
    throw new SaasApiError(500, 'account_incomplete', '账号租户信息不完整。');
  }
  return account;
}

export function toPublicAccountContext(account: SaasAccountRecord): PublicSaasAccountContext {
  return {
    user: {
      id: account.user.id,
      email: account.user.email,
      name: account.user.name,
      role: account.user.role,
    },
    organization: {
      id: account.organization.id,
      name: account.organization.name,
      slug: account.organization.slug,
    },
    subscription: {
      tier: account.subscription.tier,
      status: account.subscription.status,
      seats: account.subscription.seats,
      trialEndsAt: account.subscription.trialEndsAt,
      currentPeriodEndsAt: account.subscription.currentPeriodEndsAt,
    },
    entitlements: buildEntitlements(account.subscription),
  };
}

function assertArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new SaasApiError(400, 'invalid_learning_backup', `${field} 必须是数组。`);
  }
  return value;
}

export function validateLearningBackup(value: unknown): LearningBackupSnapshot {
  const bytes = Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
  if (bytes > MAX_BACKUP_BYTES) {
    throw new SaasApiError(413, 'learning_backup_too_large', '学习数据超过 2 MB，请先导出归档后再同步。');
  }

  const input = value && typeof value === 'object' ? value as Partial<LearningBackupSnapshot> : {};
  const data = input.data && typeof input.data === 'object' ? input.data as Partial<LearningBackupSnapshot['data']> : null;
  if (input.app !== 'english-training-cabin' || input.schemaVersion !== 1 || !data) {
    throw new SaasApiError(400, 'invalid_learning_backup', '学习数据格式不正确。');
  }

  return {
    app: 'english-training-cabin',
    schemaVersion: 1,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
    data: {
      studyGoals: assertArray(data.studyGoals, 'studyGoals'),
      practiceSessions: assertArray(data.practiceSessions, 'practiceSessions'),
      attempts: assertArray(data.attempts, 'attempts'),
      reviewItems: assertArray(data.reviewItems, 'reviewItems'),
      skillProfiles: assertArray(data.skillProfiles, 'skillProfiles'),
    },
  };
}

export function summarizeLearningSnapshot(snapshot: CloudLearningSnapshotRecord) {
  return {
    updatedAt: snapshot.updatedAt,
    exportedAt: snapshot.backup.exportedAt,
    counts: {
      studyGoals: snapshot.backup.data.studyGoals.length,
      practiceSessions: snapshot.backup.data.practiceSessions.length,
      attempts: snapshot.backup.data.attempts.length,
      reviewItems: snapshot.backup.data.reviewItems.length,
      skillProfiles: snapshot.backup.data.skillProfiles.length,
    },
  };
}
