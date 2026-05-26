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
  emailVerifiedAt?: string;
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
  provider?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
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

export type LearningEntityType = 'studyGoal' | 'practiceSession' | 'attempt' | 'reviewItem' | 'skillProfile';

export interface CloudLearningEntityRecord {
  organizationId: string;
  userId: string;
  entityType: LearningEntityType;
  entityId: string;
  payload: unknown;
  updatedAt: string;
  deletedAt?: string;
}

export interface SaasOneTimeTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  purpose: 'email_verification' | 'password_reset';
  expiresAt: string;
  consumedAt?: string;
  createdAt: string;
}

export interface BillingWebhookEventRecord {
  id: string;
  provider: string;
  type: string;
  organizationId?: string;
  receivedAt: string;
}

export interface SaasSessionRecord {
  id: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  userAgent?: string;
  ipAddress?: string;
}

export type ContentAssetType = 'reading' | 'listening' | 'writing' | 'translation' | 'speaking';
export type ContentSourceType = 'original' | 'licensed' | 'user-imported' | 'ai-generated';
export type ContentLicenseStatus = 'draft' | 'cleared' | 'needs_review' | 'blocked';

export interface ContentAssetRecord {
  id: string;
  organizationId: string;
  title: string;
  assetType: ContentAssetType;
  sourceType: ContentSourceType;
  licenseStatus: ContentLicenseStatus;
  ownerUserId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DataRequestType = 'export' | 'delete';
export type DataRequestStatus = 'queued' | 'processing' | 'completed' | 'rejected';

export interface DataRequestRecord {
  id: string;
  organizationId: string;
  userId: string;
  requestType: DataRequestType;
  status: DataRequestStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface OrganizationInvitationRecord {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedByUserId: string;
  tokenHash: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface SaasDatabaseShape {
  schemaVersion: 3;
  users: SaasUserRecord[];
  organizations: SaasOrganizationRecord[];
  subscriptions: SaasSubscriptionRecord[];
  learningSnapshots: CloudLearningSnapshotRecord[];
  learningEntities: CloudLearningEntityRecord[];
  oneTimeTokens: SaasOneTimeTokenRecord[];
  billingWebhookEvents: BillingWebhookEventRecord[];
  sessions: SaasSessionRecord[];
  organizationInvitations: OrganizationInvitationRecord[];
  contentAssets: ContentAssetRecord[];
  dataRequests: DataRequestRecord[];
}

export interface SaasAccountRecord {
  user: SaasUserRecord;
  organization: SaasOrganizationRecord;
  subscription: SaasSubscriptionRecord;
}

export interface SaasStore {
  kind: 'memory' | 'file' | 'postgres';
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
  createSession(input: {
    userId: string;
    organizationId: string;
    expiresAt: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<SaasSessionRecord>;
  getActiveSession(sessionId: string, userId: string, now: string): Promise<SaasSessionRecord | undefined>;
  touchSession(sessionId: string, at: string): Promise<void>;
  revokeSession(sessionId: string, userId: string, at: string): Promise<boolean>;
  listUserSessions(userId: string): Promise<SaasSessionRecord[]>;
  saveLearningSnapshot(input: {
    organizationId: string;
    userId: string;
    backup: LearningBackupSnapshot;
  }): Promise<CloudLearningSnapshotRecord>;
  getLearningSnapshot(organizationId: string, userId: string): Promise<CloudLearningSnapshotRecord | undefined>;
  upsertLearningEntities(input: {
    organizationId: string;
    userId: string;
    entities: CloudLearningEntityRecord[];
  }): Promise<CloudLearningEntityRecord[]>;
  listLearningEntities(input: {
    organizationId: string;
    userId: string;
    since?: string;
  }): Promise<CloudLearningEntityRecord[]>;
  deleteLearningData(organizationId: string, userId: string): Promise<{
    snapshotsDeleted: number;
    entitiesDeleted: number;
  }>;
  applyBillingEvent(input: BillingEventInput): Promise<SaasSubscriptionRecord>;
  hasBillingEvent(provider: string, eventId: string): Promise<boolean>;
  createOrganizationInvitation(input: {
    organizationId: string;
    email: string;
    role: OrganizationRole;
    invitedByUserId: string;
    expiresAt: string;
  }): Promise<{ token: string; invitation: OrganizationInvitationRecord }>;
  acceptOrganizationInvitation(input: {
    token: string;
    name: string;
    passwordHash: string;
    now: string;
  }): Promise<SaasAccountRecord>;
  listOrganizationMembers(organizationId: string): Promise<SaasUserRecord[]>;
  listOrganizationInvitations(organizationId: string): Promise<OrganizationInvitationRecord[]>;
  createContentAsset(input: {
    organizationId: string;
    ownerUserId: string;
    title: string;
    assetType: ContentAssetType;
    sourceType: ContentSourceType;
    licenseStatus: ContentLicenseStatus;
    notes?: string;
  }): Promise<ContentAssetRecord>;
  listContentAssets(organizationId: string): Promise<ContentAssetRecord[]>;
  updateContentAsset(input: {
    organizationId: string;
    assetId: string;
    licenseStatus: ContentLicenseStatus;
    notes?: string;
  }): Promise<ContentAssetRecord>;
  createDataRequest(input: {
    organizationId: string;
    userId: string;
    requestType: DataRequestType;
    note?: string;
  }): Promise<DataRequestRecord>;
  listDataRequests(input: {
    organizationId: string;
    userId?: string;
  }): Promise<DataRequestRecord[]>;
  resolveDataRequest(input: {
    organizationId: string;
    requestId: string;
    status: Exclude<DataRequestStatus, 'queued'>;
    note?: string;
  }): Promise<DataRequestRecord>;
  getOrganizationAdminOverview(organizationId: string): Promise<{
    members: number;
    pendingInvitations: number;
    learningSnapshots: number;
    learningEntities: number;
    activeSessions: number;
    contentAssets: number;
    blockedContentAssets: number;
    openDataRequests: number;
  }>;
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
  jti: string;
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

export interface BillingEventInput {
  eventId: string;
  provider: string;
  type: 'subscription.updated' | 'subscription.canceled';
  organizationId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  seats: number;
  aiMonthlyCredits: number;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  currentPeriodEndsAt?: string;
}

export function getSessionExpiresAt(now = new Date()): string {
  return new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
}

function createEmptyDatabase(): SaasDatabaseShape {
  return {
    schemaVersion: 3,
    users: [],
    organizations: [],
    subscriptions: [],
    learningSnapshots: [],
    learningEntities: [],
    oneTimeTokens: [],
    billingWebhookEvents: [],
    sessions: [],
    organizationInvitations: [],
    contentAssets: [],
    dataRequests: [],
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

function normalizeOptionalText(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new SaasApiError(400, 'invalid_text', '文本字段格式不正确。');
  }
  const text = value.trim().replace(/[\u0000-\u001F\u007F]/g, ' ');
  if (!text) return undefined;
  if (text.length > maxLength) {
    throw new SaasApiError(400, 'invalid_text', `文本最多 ${maxLength} 个字符。`);
  }
  return text;
}

function normalizeContentTitle(value: unknown): string {
  const title = normalizeOptionalText(value, 120);
  if (!title || title.length < 2) {
    throw new SaasApiError(400, 'invalid_content_title', '内容标题需为 2-120 个字符。');
  }
  return title;
}

function normalizeContentAssetType(value: unknown): ContentAssetType {
  const types: ContentAssetType[] = ['reading', 'listening', 'writing', 'translation', 'speaking'];
  if (typeof value === 'string' && types.includes(value as ContentAssetType)) {
    return value as ContentAssetType;
  }
  throw new SaasApiError(400, 'invalid_content_asset_type', '内容类型不支持。');
}

function normalizeContentSourceType(value: unknown): ContentSourceType {
  const types: ContentSourceType[] = ['original', 'licensed', 'user-imported', 'ai-generated'];
  if (typeof value === 'string' && types.includes(value as ContentSourceType)) {
    return value as ContentSourceType;
  }
  throw new SaasApiError(400, 'invalid_content_source_type', '内容来源类型不支持。');
}

function normalizeContentLicenseStatus(value: unknown): ContentLicenseStatus {
  const statuses: ContentLicenseStatus[] = ['draft', 'cleared', 'needs_review', 'blocked'];
  if (typeof value === 'string' && statuses.includes(value as ContentLicenseStatus)) {
    return value as ContentLicenseStatus;
  }
  throw new SaasApiError(400, 'invalid_content_license_status', '授权状态不支持。');
}

function normalizeDataRequestType(value: unknown): DataRequestType {
  if (value === 'export' || value === 'delete') return value;
  throw new SaasApiError(400, 'invalid_data_request_type', '数据请求类型不支持。');
}

function normalizeDataRequestStatus(value: unknown): Exclude<DataRequestStatus, 'queued'> {
  if (value === 'processing' || value === 'completed' || value === 'rejected') return value;
  throw new SaasApiError(400, 'invalid_data_request_status', '数据请求状态不支持。');
}

function assertPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH || value.length > 128) {
    throw new SaasApiError(400, 'weak_password', `密码至少 ${PASSWORD_MIN_LENGTH} 位。`);
  }
  return value;
}

function hashOneTimeToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('base64url');
}

function slugifyOrganization(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return normalized || `org-${crypto.randomUUID().slice(0, 8)}`;
}

function createOrganizationSlug(name: string): string {
  const suffix = crypto.randomUUID().slice(0, 8);
  const base = slugifyOrganization(name)
    .slice(0, 39)
    .replace(/-+$/g, '') || 'org';
  return `${base}-${suffix}`;
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
          slug: createOrganizationSlug(organizationName),
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
    createSession(input) {
      return mutate((db) => {
        const now = new Date().toISOString();
        const session: SaasSessionRecord = {
          id: crypto.randomUUID(),
          userId: input.userId,
          organizationId: input.organizationId,
          createdAt: now,
          expiresAt: input.expiresAt,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
        };
        db.sessions.push(session);
        return session;
      });
    },
    getActiveSession(sessionId, userId, now) {
      return read((db) => db.sessions.find((session) =>
        session.id === sessionId &&
        session.userId === userId &&
        !session.revokedAt &&
        session.expiresAt > now,
      ));
    },
    touchSession(sessionId, at) {
      return mutate((db) => {
        const session = db.sessions.find((item) => item.id === sessionId);
        if (session && !session.revokedAt) {
          session.lastUsedAt = at;
        }
      });
    },
    revokeSession(sessionId, userId, at) {
      return mutate((db) => {
        const session = db.sessions.find((item) => item.id === sessionId && item.userId === userId);
        if (!session || session.revokedAt) return false;
        session.revokedAt = at;
        return true;
      });
    },
    listUserSessions(userId) {
      return read((db) => db.sessions
        .filter((session) => session.userId === userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
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
    upsertLearningEntities(input) {
      return mutate((db) => {
        const nextEntities = input.entities.map((entity) => ({
          ...entity,
          organizationId: input.organizationId,
          userId: input.userId,
        }));

        nextEntities.forEach((entity) => {
          const currentIndex = db.learningEntities.findIndex((item) =>
            item.organizationId === input.organizationId &&
            item.userId === input.userId &&
            item.entityType === entity.entityType &&
            item.entityId === entity.entityId,
          );
          if (currentIndex >= 0) db.learningEntities[currentIndex] = entity;
          else db.learningEntities.push(entity);
        });

        return nextEntities;
      });
    },
    listLearningEntities(input) {
      return read((db) => db.learningEntities
        .filter((entity) =>
          entity.organizationId === input.organizationId &&
          entity.userId === input.userId &&
          (!input.since || entity.updatedAt > input.since),
        )
        .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)));
    },
    deleteLearningData(organizationId, userId) {
      return mutate((db) => {
        const snapshotCount = db.learningSnapshots.length;
        const entityCount = db.learningEntities.length;
        db.learningSnapshots = db.learningSnapshots.filter((snapshot) =>
          snapshot.organizationId !== organizationId || snapshot.userId !== userId,
        );
        db.learningEntities = db.learningEntities.filter((entity) =>
          entity.organizationId !== organizationId || entity.userId !== userId,
        );
        return {
          snapshotsDeleted: snapshotCount - db.learningSnapshots.length,
          entitiesDeleted: entityCount - db.learningEntities.length,
        };
      });
    },
    applyBillingEvent(input) {
      return mutate((db) => {
        if (db.billingWebhookEvents.some((event) => event.id === input.eventId && event.provider === input.provider)) {
          const existing = db.subscriptions.find((subscription) => subscription.organizationId === input.organizationId);
          if (!existing) {
            throw new SaasApiError(404, 'organization_not_found', '订阅所属租户不存在。');
          }
          return existing;
        }

        const existing = db.subscriptions.find((subscription) => subscription.organizationId === input.organizationId);
        if (!existing) {
          throw new SaasApiError(404, 'organization_not_found', '订阅所属租户不存在。');
        }

        const now = new Date().toISOString();
        existing.tier = input.tier;
        existing.status = input.status;
        existing.seats = input.seats;
        existing.aiMonthlyCredits = input.aiMonthlyCredits;
        existing.provider = input.provider;
        existing.providerCustomerId = input.providerCustomerId;
        existing.providerSubscriptionId = input.providerSubscriptionId;
        existing.currentPeriodEndsAt = input.currentPeriodEndsAt;
        existing.updatedAt = now;
        db.billingWebhookEvents.push({
          id: input.eventId,
          provider: input.provider,
          type: input.type,
          organizationId: input.organizationId,
          receivedAt: now,
        });
        return existing;
      });
    },
    hasBillingEvent(provider, eventId) {
      return read((db) => db.billingWebhookEvents.some((event) => event.id === eventId && event.provider === provider));
    },
    createOrganizationInvitation(input) {
      return mutate((db) => {
        const organization = db.organizations.find((item) => item.id === input.organizationId);
        if (!organization) {
          throw new SaasApiError(404, 'organization_not_found', '团队不存在。');
        }
        if (db.users.some((user) => user.email === input.email)) {
          throw new SaasApiError(409, 'email_exists', '该邮箱已是系统用户。');
        }

        const token = crypto.randomBytes(32).toString('base64url');
        const invitation: OrganizationInvitationRecord = {
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          email: input.email,
          role: input.role,
          invitedByUserId: input.invitedByUserId,
          tokenHash: hashOneTimeToken(token),
          expiresAt: input.expiresAt,
          createdAt: new Date().toISOString(),
        };
        db.organizationInvitations.push(invitation);
        return { token, invitation };
      });
    },
    acceptOrganizationInvitation(input) {
      return mutate((db) => {
        const invitation = db.organizationInvitations.find((item) =>
          item.tokenHash === hashOneTimeToken(input.token) &&
          !item.acceptedAt &&
          item.expiresAt > input.now,
        );
        if (!invitation) {
          throw new SaasApiError(400, 'invalid_invitation', '邀请链接无效或已过期。');
        }
        if (db.users.some((user) => user.email === invitation.email)) {
          throw new SaasApiError(409, 'email_exists', '该邮箱已是系统用户。');
        }

        const organization = db.organizations.find((item) => item.id === invitation.organizationId);
        const subscription = db.subscriptions.find((item) => item.organizationId === invitation.organizationId);
        if (!organization || !subscription) {
          throw new SaasApiError(404, 'organization_not_found', '团队不存在。');
        }

        const user: SaasUserRecord = {
          id: crypto.randomUUID(),
          email: invitation.email,
          name: input.name,
          passwordHash: input.passwordHash,
          organizationId: invitation.organizationId,
          role: invitation.role,
          createdAt: input.now,
          updatedAt: input.now,
        };
        invitation.acceptedAt = input.now;
        db.users.push(user);
        return { user, organization, subscription };
      });
    },
    listOrganizationMembers(organizationId) {
      return read((db) => db.users
        .filter((user) => user.organizationId === organizationId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)));
    },
    listOrganizationInvitations(organizationId) {
      return read((db) => db.organizationInvitations
        .filter((invitation) => invitation.organizationId === organizationId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    },
    createContentAsset(input) {
      return mutate((db) => {
        const now = new Date().toISOString();
        const asset: ContentAssetRecord = {
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          title: normalizeContentTitle(input.title),
          assetType: normalizeContentAssetType(input.assetType),
          sourceType: normalizeContentSourceType(input.sourceType),
          licenseStatus: normalizeContentLicenseStatus(input.licenseStatus),
          ownerUserId: input.ownerUserId,
          notes: normalizeOptionalText(input.notes, 600),
          createdAt: now,
          updatedAt: now,
        };
        db.contentAssets.push(asset);
        return asset;
      });
    },
    listContentAssets(organizationId) {
      return read((db) => db.contentAssets
        .filter((asset) => asset.organizationId === organizationId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    },
    updateContentAsset(input) {
      return mutate((db) => {
        const asset = db.contentAssets.find((item) =>
          item.id === input.assetId && item.organizationId === input.organizationId,
        );
        if (!asset) {
          throw new SaasApiError(404, 'content_asset_not_found', '内容资产不存在。');
        }
        asset.licenseStatus = normalizeContentLicenseStatus(input.licenseStatus);
        asset.notes = normalizeOptionalText(input.notes, 600);
        asset.updatedAt = new Date().toISOString();
        return asset;
      });
    },
    createDataRequest(input) {
      return mutate((db) => {
        const now = new Date().toISOString();
        const request: DataRequestRecord = {
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          userId: input.userId,
          requestType: normalizeDataRequestType(input.requestType),
          status: 'queued',
          note: normalizeOptionalText(input.note, 600),
          createdAt: now,
          updatedAt: now,
        };
        db.dataRequests.push(request);
        return request;
      });
    },
    listDataRequests(input) {
      return read((db) => db.dataRequests
        .filter((request) =>
          request.organizationId === input.organizationId &&
          (!input.userId || request.userId === input.userId),
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    },
    resolveDataRequest(input) {
      return mutate((db) => {
        const request = db.dataRequests.find((item) =>
          item.id === input.requestId && item.organizationId === input.organizationId,
        );
        if (!request) {
          throw new SaasApiError(404, 'data_request_not_found', '数据请求不存在。');
        }
        const now = new Date().toISOString();
        request.status = normalizeDataRequestStatus(input.status);
        request.note = normalizeOptionalText(input.note, 600);
        request.updatedAt = now;
        if (request.status === 'completed' || request.status === 'rejected') {
          request.completedAt = now;
        }
        return request;
      });
    },
    getOrganizationAdminOverview(organizationId) {
      const now = new Date().toISOString();
      return read((db) => ({
        members: db.users.filter((user) => user.organizationId === organizationId).length,
        pendingInvitations: db.organizationInvitations.filter((invitation) =>
          invitation.organizationId === organizationId && !invitation.acceptedAt && invitation.expiresAt > now,
        ).length,
        learningSnapshots: db.learningSnapshots.filter((snapshot) => snapshot.organizationId === organizationId).length,
        learningEntities: db.learningEntities.filter((entity) => entity.organizationId === organizationId && !entity.deletedAt).length,
        activeSessions: db.sessions.filter((session) =>
          session.organizationId === organizationId && !session.revokedAt && session.expiresAt > now,
        ).length,
        contentAssets: db.contentAssets.filter((asset) => asset.organizationId === organizationId).length,
        blockedContentAssets: db.contentAssets.filter((asset) =>
          asset.organizationId === organizationId && asset.licenseStatus === 'blocked',
        ).length,
        openDataRequests: db.dataRequests.filter((request) =>
          request.organizationId === organizationId && (request.status === 'queued' || request.status === 'processing'),
        ).length,
      }));
    },
  };
}

export function createInMemorySaasStore(initial?: Partial<SaasDatabaseShape>): SaasStore {
  return createStoreFromDatabase({
    kind: 'memory',
    initial: {
      ...createEmptyDatabase(),
      ...initial,
      contentAssets: initial?.contentAssets ?? [],
      dataRequests: initial?.dataRequests ?? [],
      schemaVersion: 3,
    },
  });
}

function normalizeDatabaseShape(value: unknown): SaasDatabaseShape {
  const input = value && typeof value === 'object' ? value as Partial<SaasDatabaseShape> : {};
  return {
    schemaVersion: 3,
    users: Array.isArray(input.users) ? input.users : [],
    organizations: Array.isArray(input.organizations) ? input.organizations : [],
    subscriptions: Array.isArray(input.subscriptions) ? input.subscriptions : [],
    learningSnapshots: Array.isArray(input.learningSnapshots) ? input.learningSnapshots : [],
    learningEntities: Array.isArray(input.learningEntities) ? input.learningEntities : [],
    oneTimeTokens: Array.isArray(input.oneTimeTokens) ? input.oneTimeTokens : [],
    billingWebhookEvents: Array.isArray(input.billingWebhookEvents) ? input.billingWebhookEvents : [],
    sessions: Array.isArray(input.sessions) ? input.sessions : [],
    organizationInvitations: Array.isArray(input.organizationInvitations) ? input.organizationInvitations : [],
    contentAssets: Array.isArray(input.contentAssets) ? input.contentAssets : [],
    dataRequests: Array.isArray(input.dataRequests) ? input.dataRequests : [],
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

export function issueSessionToken(account: SaasAccountRecord, secret: string, now = Math.floor(Date.now() / 1000), sessionId: string = crypto.randomUUID()): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: SaasSessionPayload = {
    iss: 'english-training-cabin',
    aud: 'english-training-cabin-web',
    jti: sessionId,
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
    typeof payload.jti !== 'string' ||
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

export async function createWorkspaceInvitation(store: SaasStore, actor: SaasAccountRecord, value: unknown): Promise<{
  token: string;
  invitation: OrganizationInvitationRecord;
}> {
  if (actor.user.role !== 'owner') {
    throw new SaasApiError(403, 'forbidden', '只有团队所有者可以邀请成员。');
  }
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const email = normalizeEmail(input.email);
  const role: OrganizationRole = input.role === 'owner' ? 'owner' : 'member';

  return store.createOrganizationInvitation({
    organizationId: actor.organization.id,
    email,
    role,
    invitedByUserId: actor.user.id,
    expiresAt: addDays(new Date(), 7),
  });
}

export async function acceptWorkspaceInvitation(store: SaasStore, value: unknown): Promise<SaasAccountRecord> {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const token = typeof input.token === 'string' ? input.token : '';
  if (token.length < 24 || token.length > 256) {
    throw new SaasApiError(400, 'invalid_invitation', '邀请链接无效。');
  }
  const name = normalizeName(input.name);
  const password = assertPassword(input.password);

  return store.acceptOrganizationInvitation({
    token,
    name,
    passwordHash: hashPassword(password),
    now: new Date().toISOString(),
  });
}

export function toPublicMembers(users: SaasUserRecord[]) {
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  }));
}

export function toPublicInvitations(invitations: OrganizationInvitationRecord[]) {
  return invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    createdAt: invitation.createdAt,
  }));
}

export function toPublicSessions(sessions: SaasSessionRecord[], currentSessionId?: string) {
  const now = new Date().toISOString();
  return sessions.map((session) => ({
    id: session.id,
    current: session.id === currentSessionId,
    active: !session.revokedAt && session.expiresAt > now,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
  }));
}

export function toPublicContentAssets(assets: ContentAssetRecord[]) {
  return assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    assetType: asset.assetType,
    sourceType: asset.sourceType,
    licenseStatus: asset.licenseStatus,
    notes: asset.notes,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  }));
}

export function toPublicDataRequests(requests: DataRequestRecord[]) {
  return requests.map((request) => ({
    id: request.id,
    userId: request.userId,
    requestType: request.requestType,
    status: request.status,
    note: request.note,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    completedAt: request.completedAt,
  }));
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

const VALID_LEARNING_ENTITY_TYPES: LearningEntityType[] = ['studyGoal', 'practiceSession', 'attempt', 'reviewItem', 'skillProfile'];

function validateLearningEntityType(value: unknown): LearningEntityType {
  if (typeof value === 'string' && VALID_LEARNING_ENTITY_TYPES.includes(value as LearningEntityType)) {
    return value as LearningEntityType;
  }
  throw new SaasApiError(400, 'invalid_learning_entity', '学习数据类型不支持。');
}

function validateEntityId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > 160) {
    throw new SaasApiError(400, 'invalid_learning_entity', '学习数据 ID 不正确。');
  }
  return value.trim();
}

function validateIsoDate(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value !== 'string') return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

export function validateLearningEntities(value: unknown, organizationId: string, userId: string): CloudLearningEntityRecord[] {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawEntities = Array.isArray(input.entities) ? input.entities : [];
  if (rawEntities.length === 0 || rawEntities.length > 200) {
    throw new SaasApiError(400, 'invalid_learning_entities', '学习数据实体数量需为 1-200。');
  }

  return rawEntities.map((item, index) => {
    const entity = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const payload = entity.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new SaasApiError(400, 'invalid_learning_entity', `entities[${index}].payload 必须是对象。`);
    }
    return {
      organizationId,
      userId,
      entityType: validateLearningEntityType(entity.entityType),
      entityId: validateEntityId(entity.entityId),
      payload,
      updatedAt: validateIsoDate(entity.updatedAt),
      deletedAt: typeof entity.deletedAt === 'string' ? validateIsoDate(entity.deletedAt) : undefined,
    };
  });
}

function validateSubscriptionTier(value: unknown): SubscriptionTier {
  if (value === 'free' || value === 'pro' || value === 'team' || value === 'enterprise') return value;
  throw new SaasApiError(400, 'invalid_billing_event', '订阅套餐不支持。');
}

function validateSubscriptionStatus(value: unknown): SubscriptionStatus {
  if (value === 'trialing' || value === 'active' || value === 'past_due' || value === 'canceled') return value;
  throw new SaasApiError(400, 'invalid_billing_event', '订阅状态不支持。');
}

export function validateBillingEvent(value: unknown): BillingEventInput {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const type = input.type === 'subscription.canceled' ? 'subscription.canceled' : 'subscription.updated';
  const organizationId = typeof input.organizationId === 'string' ? input.organizationId : '';
  if (!organizationId) {
    throw new SaasApiError(400, 'invalid_billing_event', '缺少 organizationId。');
  }
  const eventId = typeof input.eventId === 'string' ? input.eventId : '';
  if (!eventId) {
    throw new SaasApiError(400, 'invalid_billing_event', '缺少 eventId。');
  }

  return {
    eventId,
    provider: typeof input.provider === 'string' ? input.provider : 'manual',
    type,
    organizationId,
    tier: validateSubscriptionTier(input.tier),
    status: type === 'subscription.canceled' ? 'canceled' : validateSubscriptionStatus(input.status),
    seats: Math.max(1, Math.min(5000, Math.round(Number(input.seats ?? 1)) || 1)),
    aiMonthlyCredits: Math.max(0, Math.min(5_000_000, Math.round(Number(input.aiMonthlyCredits ?? 0)) || 0)),
    providerCustomerId: typeof input.providerCustomerId === 'string' ? input.providerCustomerId : undefined,
    providerSubscriptionId: typeof input.providerSubscriptionId === 'string' ? input.providerSubscriptionId : undefined,
    currentPeriodEndsAt: typeof input.currentPeriodEndsAt === 'string' ? validateIsoDate(input.currentPeriodEndsAt) : undefined,
  };
}

export function signBillingWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyBillingWebhookSignature(payload: string, signature: string | undefined, secret: string | undefined) {
  if (!secret) {
    throw new SaasApiError(503, 'billing_not_configured', '订阅 webhook 密钥未配置。');
  }
  if (!signature) {
    throw new SaasApiError(401, 'invalid_signature', '订阅 webhook 签名缺失。');
  }
  const expected = Buffer.from(signBillingWebhookPayload(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new SaasApiError(401, 'invalid_signature', '订阅 webhook 签名无效。');
  }
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
