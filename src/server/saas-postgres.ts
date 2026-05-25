import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';
import {
  BillingEventInput,
  CloudLearningEntityRecord,
  CloudLearningSnapshotRecord,
  ContentAssetRecord,
  DataRequestRecord,
  OrganizationInvitationRecord,
  SaasAccountRecord,
  SaasApiError,
  SaasOneTimeTokenRecord,
  SaasOrganizationRecord,
  SaasSessionRecord,
  SaasStore,
  SaasSubscriptionRecord,
  SaasUserRecord,
} from './saas';

const SAAS_CORE_MIGRATION = `
CREATE TABLE IF NOT EXISTS saas_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS subscriptions (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('free', 'pro', 'team', 'enterprise')),
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  seats integer NOT NULL CHECK (seats >= 1),
  ai_monthly_credits integer NOT NULL CHECK (ai_monthly_credits >= 0),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_snapshots (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  backup jsonb NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS learning_entities (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('studyGoal', 'practiceSession', 'attempt', 'reviewItem', 'skillProfile')),
  entity_id text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  PRIMARY KEY (organization_id, user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS learning_entities_sync_idx
  ON learning_entities (organization_id, user_id, updated_at);

CREATE TABLE IF NOT EXISTS one_time_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS one_time_tokens_lookup_idx
  ON one_time_tokens (token_hash, purpose, expires_at);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id text NOT NULL,
  provider text NOT NULL,
  type text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL,
  PRIMARY KEY (id, provider)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  user_agent text,
  ip_address text
);

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS sessions_active_idx
  ON sessions (id, user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  invited_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS organization_invitations_org_idx
  ON organization_invitations (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS organization_invitations_token_idx
  ON organization_invitations (token_hash, expires_at)
  WHERE accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS content_assets (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('reading', 'listening', 'writing', 'translation', 'speaking')),
  source_type text NOT NULL CHECK (source_type IN ('original', 'licensed', 'user-imported', 'ai-generated')),
  license_status text NOT NULL CHECK (license_status IN ('draft', 'cleared', 'needs_review', 'blocked')),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS content_assets_org_idx
  ON content_assets (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS data_requests (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('export', 'delete')),
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'rejected')),
  note text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS data_requests_org_idx
  ON data_requests (organization_id, created_at DESC);
`;

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapUser(row: Record<string, unknown>): SaasUserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    passwordHash: String(row.password_hash),
    organizationId: String(row.organization_id),
    role: row.role === 'member' ? 'member' : 'owner',
    emailVerifiedAt: toIso(row.email_verified_at as Date | string | null),
    createdAt: toIso(row.created_at as Date | string)!,
    updatedAt: toIso(row.updated_at as Date | string)!,
    lastLoginAt: toIso(row.last_login_at as Date | string | null),
  };
}

function mapOrganization(row: Record<string, unknown>): SaasOrganizationRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    createdAt: toIso(row.created_at as Date | string)!,
    updatedAt: toIso(row.updated_at as Date | string)!,
  };
}

function mapSubscription(row: Record<string, unknown>): SaasSubscriptionRecord {
  return {
    organizationId: String(row.organization_id),
    tier: row.tier as SaasSubscriptionRecord['tier'],
    status: row.status as SaasSubscriptionRecord['status'],
    seats: Number(row.seats),
    aiMonthlyCredits: Number(row.ai_monthly_credits),
    provider: row.provider ? String(row.provider) : undefined,
    providerCustomerId: row.provider_customer_id ? String(row.provider_customer_id) : undefined,
    providerSubscriptionId: row.provider_subscription_id ? String(row.provider_subscription_id) : undefined,
    trialEndsAt: toIso(row.trial_ends_at as Date | string | null),
    currentPeriodEndsAt: toIso(row.current_period_ends_at as Date | string | null),
    createdAt: toIso(row.created_at as Date | string)!,
    updatedAt: toIso(row.updated_at as Date | string)!,
  };
}

function mapEntity(row: Record<string, unknown>): CloudLearningEntityRecord {
  return {
    organizationId: String(row.organization_id),
    userId: String(row.user_id),
    entityType: row.entity_type as CloudLearningEntityRecord['entityType'],
    entityId: String(row.entity_id),
    payload: row.payload,
    updatedAt: toIso(row.updated_at as Date | string)!,
    deletedAt: toIso(row.deleted_at as Date | string | null),
  };
}

function mapSession(row: Record<string, unknown>): SaasSessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    organizationId: String(row.organization_id),
    createdAt: toIso(row.created_at as Date | string)!,
    expiresAt: toIso(row.expires_at as Date | string)!,
    lastUsedAt: toIso(row.last_used_at as Date | string | null),
    revokedAt: toIso(row.revoked_at as Date | string | null),
    userAgent: row.user_agent ? String(row.user_agent) : undefined,
    ipAddress: row.ip_address ? String(row.ip_address) : undefined,
  };
}

function mapInvitation(row: Record<string, unknown>): OrganizationInvitationRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    email: String(row.email),
    role: row.role === 'owner' ? 'owner' : 'member',
    invitedByUserId: String(row.invited_by_user_id),
    tokenHash: String(row.token_hash),
    expiresAt: toIso(row.expires_at as Date | string)!,
    acceptedAt: toIso(row.accepted_at as Date | string | null),
    createdAt: toIso(row.created_at as Date | string)!,
  };
}

function mapContentAsset(row: Record<string, unknown>): ContentAssetRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    title: String(row.title),
    assetType: row.asset_type as ContentAssetRecord['assetType'],
    sourceType: row.source_type as ContentAssetRecord['sourceType'],
    licenseStatus: row.license_status as ContentAssetRecord['licenseStatus'],
    ownerUserId: String(row.owner_user_id),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: toIso(row.created_at as Date | string)!,
    updatedAt: toIso(row.updated_at as Date | string)!,
  };
}

function mapDataRequest(row: Record<string, unknown>): DataRequestRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    userId: String(row.user_id),
    requestType: row.request_type as DataRequestRecord['requestType'],
    status: row.status as DataRequestRecord['status'],
    note: row.note ? String(row.note) : undefined,
    createdAt: toIso(row.created_at as Date | string)!,
    updatedAt: toIso(row.updated_at as Date | string)!,
    completedAt: toIso(row.completed_at as Date | string | null),
  };
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

function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

async function getAccountForUserId(client: Pool | PoolClient, userId: string): Promise<SaasAccountRecord | undefined> {
  const result = await client.query(`
    SELECT
      u.*,
      o.id AS org_id,
      o.name AS org_name,
      o.slug AS org_slug,
      o.created_at AS org_created_at,
      o.updated_at AS org_updated_at,
      s.organization_id AS sub_organization_id,
      s.tier,
      s.status,
      s.seats,
      s.ai_monthly_credits,
      s.provider,
      s.provider_customer_id,
      s.provider_subscription_id,
      s.trial_ends_at,
      s.current_period_ends_at,
      s.created_at AS sub_created_at,
      s.updated_at AS sub_updated_at
    FROM users u
    JOIN organizations o ON o.id = u.organization_id
    JOIN subscriptions s ON s.organization_id = u.organization_id
    WHERE u.id = $1
  `, [userId]);

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return undefined;

  return {
    user: mapUser(row),
    organization: mapOrganization({
      id: row.org_id,
      name: row.org_name,
      slug: row.org_slug,
      created_at: row.org_created_at,
      updated_at: row.org_updated_at,
    }),
    subscription: mapSubscription({
      organization_id: row.sub_organization_id,
      tier: row.tier,
      status: row.status,
      seats: row.seats,
      ai_monthly_credits: row.ai_monthly_credits,
      provider: row.provider,
      provider_customer_id: row.provider_customer_id,
      provider_subscription_id: row.provider_subscription_id,
      trial_ends_at: row.trial_ends_at,
      current_period_ends_at: row.current_period_ends_at,
      created_at: row.sub_created_at,
      updated_at: row.sub_updated_at,
    }),
  };
}

export function createPostgresSaasStore(databaseUrl: string): SaasStore {
  const pool = new Pool({ connectionString: databaseUrl });
  let migrated: Promise<void> | undefined;

  async function ensureMigrated() {
    migrated ??= (async () => {
      await pool.query(SAAS_CORE_MIGRATION);
      await pool.query(
        'INSERT INTO saas_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
        ['0001_saas_core'],
      );
      await pool.query(
        'INSERT INTO saas_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
        ['0002_workspace_sessions'],
      );
      await pool.query(
        'INSERT INTO saas_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
        ['0003_commercial_ops'],
      );
    })();
    await migrated;
  }

  async function withClient<T>(handler: (client: Pool) => Promise<T>) {
    await ensureMigrated();
    return handler(pool);
  }

  async function withTransaction<T>(handler: (client: PoolClient) => Promise<T>) {
    await ensureMigrated();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    kind: 'postgres',
    findUserByEmail(email) {
      return withClient(async (client) => {
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] ? mapUser(result.rows[0]) : undefined;
      });
    },
    findUserById(userId) {
      return withClient(async (client) => {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        return result.rows[0] ? mapUser(result.rows[0]) : undefined;
      });
    },
    createAccount(input) {
      return withTransaction(async (client) => {
        const now = new Date().toISOString();
        const organizationId = crypto.randomUUID();
        const userId = crypto.randomUUID();
        const organizationName = input.organizationName ?? `${input.name}的英语训练舱`;
        const slug = slugifyOrganization(organizationName);

        try {
          const organizationResult = await client.query(
            'INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, $4, $4) RETURNING *',
            [organizationId, organizationName, slug, now],
          );
          const userResult = await client.query(
            `INSERT INTO users (id, email, name, password_hash, organization_id, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'owner', $6, $6) RETURNING *`,
            [userId, input.email, input.name, input.passwordHash, organizationId, now],
          );
          const subscriptionResult = await client.query(
            `INSERT INTO subscriptions (organization_id, tier, status, seats, ai_monthly_credits, trial_ends_at, created_at, updated_at)
             VALUES ($1, 'pro', 'trialing', 1, 1000, $2, $3, $3) RETURNING *`,
            [organizationId, addDays(new Date(now), 14), now],
          );

          return {
            user: mapUser(userResult.rows[0]),
            organization: mapOrganization(organizationResult.rows[0]),
            subscription: mapSubscription(subscriptionResult.rows[0]),
          };
        } catch (error) {
          if ((error as { code?: string }).code === '23505') {
            throw new SaasApiError(409, 'email_exists', '该邮箱已注册，请直接登录。');
          }
          throw error;
        }
      });
    },
    updateUserLogin(userId, at) {
      return withClient(async (client) => {
        await client.query('UPDATE users SET last_login_at = $2, updated_at = $2 WHERE id = $1', [userId, at]);
      });
    },
    getAccountForUser(userId) {
      return withClient((client) => getAccountForUserId(client, userId));
    },
    createSession(input) {
      return withClient(async (client) => {
        const now = new Date().toISOString();
        const result = await client.query(
          `INSERT INTO sessions (id, user_id, organization_id, created_at, expires_at, user_agent, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [crypto.randomUUID(), input.userId, input.organizationId, now, input.expiresAt, input.userAgent, input.ipAddress],
        );
        return mapSession(result.rows[0]);
      });
    },
    getActiveSession(sessionId, userId, now) {
      return withClient(async (client) => {
        const result = await client.query(
          'SELECT * FROM sessions WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > $3',
          [sessionId, userId, now],
        );
        return result.rows[0] ? mapSession(result.rows[0]) : undefined;
      });
    },
    touchSession(sessionId, at) {
      return withClient(async (client) => {
        await client.query('UPDATE sessions SET last_used_at = $2 WHERE id = $1 AND revoked_at IS NULL', [sessionId, at]);
      });
    },
    revokeSession(sessionId, userId, at) {
      return withClient(async (client) => {
        const result = await client.query(
          'UPDATE sessions SET revoked_at = $3 WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL',
          [sessionId, userId, at],
        );
        return Boolean(result.rowCount);
      });
    },
    listUserSessions(userId) {
      return withClient(async (client) => {
        const result = await client.query('SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return result.rows.map((row) => mapSession(row));
      });
    },
    saveLearningSnapshot(input) {
      return withClient(async (client) => {
        const now = new Date().toISOString();
        const result = await client.query(
          `INSERT INTO learning_snapshots (organization_id, user_id, backup, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (organization_id, user_id)
           DO UPDATE SET backup = EXCLUDED.backup, updated_at = EXCLUDED.updated_at
           RETURNING *`,
          [input.organizationId, input.userId, input.backup, now],
        );
        const row = result.rows[0] as Record<string, unknown>;
        return {
          organizationId: String(row.organization_id),
          userId: String(row.user_id),
          backup: row.backup as CloudLearningSnapshotRecord['backup'],
          updatedAt: toIso(row.updated_at as Date | string)!,
        };
      });
    },
    getLearningSnapshot(organizationId, userId) {
      return withClient(async (client) => {
        const result = await client.query(
          'SELECT * FROM learning_snapshots WHERE organization_id = $1 AND user_id = $2',
          [organizationId, userId],
        );
        const row = result.rows[0] as Record<string, unknown> | undefined;
        return row ? {
          organizationId: String(row.organization_id),
          userId: String(row.user_id),
          backup: row.backup as CloudLearningSnapshotRecord['backup'],
          updatedAt: toIso(row.updated_at as Date | string)!,
        } : undefined;
      });
    },
    upsertLearningEntities(input) {
      return withTransaction(async (client) => {
        const results: CloudLearningEntityRecord[] = [];
        for (const entity of input.entities) {
          const result = await client.query(
            `INSERT INTO learning_entities (organization_id, user_id, entity_type, entity_id, payload, updated_at, deleted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (organization_id, user_id, entity_type, entity_id)
             DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
             RETURNING *`,
            [input.organizationId, input.userId, entity.entityType, entity.entityId, entity.payload, entity.updatedAt, entity.deletedAt ?? null],
          );
          results.push(mapEntity(result.rows[0]));
        }
        return results;
      });
    },
    listLearningEntities(input) {
      return withClient(async (client) => {
        const params = [input.organizationId, input.userId] as unknown[];
        let where = 'organization_id = $1 AND user_id = $2';
        if (input.since) {
          params.push(input.since);
          where += ` AND updated_at > $${params.length}`;
        }
        const result = await client.query(
          `SELECT * FROM learning_entities WHERE ${where} ORDER BY updated_at ASC`,
          params,
        );
        return result.rows.map((row) => mapEntity(row));
      });
    },
    deleteLearningData(organizationId, userId) {
      return withTransaction(async (client) => {
        const snapshotResult = await client.query(
          'DELETE FROM learning_snapshots WHERE organization_id = $1 AND user_id = $2',
          [organizationId, userId],
        );
        const entityResult = await client.query(
          'DELETE FROM learning_entities WHERE organization_id = $1 AND user_id = $2',
          [organizationId, userId],
        );
        return {
          snapshotsDeleted: snapshotResult.rowCount ?? 0,
          entitiesDeleted: entityResult.rowCount ?? 0,
        };
      });
    },
    createOneTimeToken(input) {
      return withClient(async (client) => {
        const token = crypto.randomBytes(32).toString('base64url');
        const now = new Date().toISOString();
        const result = await client.query(
          `INSERT INTO one_time_tokens (id, user_id, token_hash, purpose, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [crypto.randomUUID(), input.userId, hashOneTimeToken(token), input.purpose, input.expiresAt, now],
        );
        const row = result.rows[0] as Record<string, unknown>;
        return {
          token,
          record: {
            id: String(row.id),
            userId: String(row.user_id),
            tokenHash: String(row.token_hash),
            purpose: row.purpose as SaasOneTimeTokenRecord['purpose'],
            expiresAt: toIso(row.expires_at as Date | string)!,
            consumedAt: toIso(row.consumed_at as Date | string | null),
            createdAt: toIso(row.created_at as Date | string)!,
          },
        };
      });
    },
    consumeOneTimeToken(input) {
      return withTransaction(async (client) => {
        const result = await client.query(
          `UPDATE one_time_tokens
           SET consumed_at = $4
           WHERE token_hash = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > $3
           RETURNING *`,
          [hashOneTimeToken(input.token), input.purpose, input.now, input.now],
        );
        const row = result.rows[0] as Record<string, unknown> | undefined;
        return row ? {
          id: String(row.id),
          userId: String(row.user_id),
          tokenHash: String(row.token_hash),
          purpose: row.purpose as SaasOneTimeTokenRecord['purpose'],
          expiresAt: toIso(row.expires_at as Date | string)!,
          consumedAt: toIso(row.consumed_at as Date | string | null),
          createdAt: toIso(row.created_at as Date | string)!,
        } : undefined;
      });
    },
    markUserEmailVerified(userId, at) {
      return withClient(async (client) => {
        await client.query(
          'UPDATE users SET email_verified_at = COALESCE(email_verified_at, $2), updated_at = $2 WHERE id = $1',
          [userId, at],
        );
        return getAccountForUserId(client, userId);
      });
    },
    updateUserPassword(userId, passwordHash, at) {
      return withClient(async (client) => {
        await client.query('UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1', [userId, passwordHash, at]);
        return getAccountForUserId(client, userId);
      });
    },
    applyBillingEvent(input: BillingEventInput) {
      return withTransaction(async (client) => {
        const existingEvent = await client.query(
          'SELECT id FROM billing_webhook_events WHERE id = $1 AND provider = $2',
          [input.eventId, input.provider],
        );
        if (existingEvent.rowCount) {
          const existingSubscription = await client.query('SELECT * FROM subscriptions WHERE organization_id = $1', [input.organizationId]);
          if (!existingSubscription.rows[0]) throw new SaasApiError(404, 'organization_not_found', '订阅所属租户不存在。');
          return mapSubscription(existingSubscription.rows[0]);
        }

        const subscriptionResult = await client.query(
          `UPDATE subscriptions
           SET tier = $2, status = $3, seats = $4, ai_monthly_credits = $5, provider = $6,
               provider_customer_id = $7, provider_subscription_id = $8,
               current_period_ends_at = $9, updated_at = $10
           WHERE organization_id = $1
           RETURNING *`,
          [
            input.organizationId,
            input.tier,
            input.status,
            input.seats,
            input.aiMonthlyCredits,
            input.provider,
            input.providerCustomerId ?? null,
            input.providerSubscriptionId ?? null,
            input.currentPeriodEndsAt ?? null,
            new Date().toISOString(),
          ],
        );
        if (!subscriptionResult.rows[0]) throw new SaasApiError(404, 'organization_not_found', '订阅所属租户不存在。');
        await client.query(
          'INSERT INTO billing_webhook_events (id, provider, type, organization_id, received_at) VALUES ($1, $2, $3, $4, $5)',
          [input.eventId, input.provider, input.type, input.organizationId, new Date().toISOString()],
        );
        return mapSubscription(subscriptionResult.rows[0]);
      });
    },
    hasBillingEvent(provider, eventId) {
      return withClient(async (client) => {
        const result = await client.query('SELECT id FROM billing_webhook_events WHERE id = $1 AND provider = $2', [eventId, provider]);
        return Boolean(result.rowCount);
      });
    },
    createOrganizationInvitation(input) {
      return withClient(async (client) => {
        const token = crypto.randomBytes(32).toString('base64url');
        try {
          const result = await client.query(
            `INSERT INTO organization_invitations
             (id, organization_id, email, role, invited_by_user_id, token_hash, expires_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
              crypto.randomUUID(),
              input.organizationId,
              input.email,
              input.role,
              input.invitedByUserId,
              hashOneTimeToken(token),
              input.expiresAt,
              new Date().toISOString(),
            ],
          );
          return { token, invitation: mapInvitation(result.rows[0]) };
        } catch (error) {
          if ((error as { code?: string }).code === '23503') {
            throw new SaasApiError(404, 'organization_not_found', '团队不存在。');
          }
          throw error;
        }
      });
    },
    acceptOrganizationInvitation(input) {
      return withTransaction(async (client) => {
        const invitationResult = await client.query(
          `UPDATE organization_invitations
           SET accepted_at = $3
           WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > $2
           RETURNING *`,
          [hashOneTimeToken(input.token), input.now, input.now],
        );
        const invitation = invitationResult.rows[0] ? mapInvitation(invitationResult.rows[0]) : undefined;
        if (!invitation) {
          throw new SaasApiError(400, 'invalid_invitation', '邀请链接无效或已过期。');
        }

        try {
          const userResult = await client.query(
            `INSERT INTO users (id, email, name, password_hash, organization_id, role, email_verified_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)
             RETURNING *`,
            [
              crypto.randomUUID(),
              invitation.email,
              input.name,
              input.passwordHash,
              invitation.organizationId,
              invitation.role,
              input.now,
            ],
          );
          const account = await getAccountForUserId(client, userResult.rows[0].id);
          if (!account) throw new SaasApiError(404, 'organization_not_found', '团队不存在。');
          return account;
        } catch (error) {
          if ((error as { code?: string }).code === '23505') {
            throw new SaasApiError(409, 'email_exists', '该邮箱已是系统用户。');
          }
          throw error;
        }
      });
    },
    listOrganizationMembers(organizationId) {
      return withClient(async (client) => {
        const result = await client.query('SELECT * FROM users WHERE organization_id = $1 ORDER BY created_at ASC', [organizationId]);
        return result.rows.map((row) => mapUser(row));
      });
    },
    listOrganizationInvitations(organizationId) {
      return withClient(async (client) => {
        const result = await client.query(
          'SELECT * FROM organization_invitations WHERE organization_id = $1 ORDER BY created_at DESC',
          [organizationId],
        );
        return result.rows.map((row) => mapInvitation(row));
      });
    },
    createContentAsset(input) {
      return withClient(async (client) => {
        const now = new Date().toISOString();
        const result = await client.query(
          `INSERT INTO content_assets
           (id, organization_id, title, asset_type, source_type, license_status, owner_user_id, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
           RETURNING *`,
          [
            crypto.randomUUID(),
            input.organizationId,
            input.title,
            input.assetType,
            input.sourceType,
            input.licenseStatus,
            input.ownerUserId,
            input.notes,
            now,
          ],
        );
        return mapContentAsset(result.rows[0]);
      });
    },
    listContentAssets(organizationId) {
      return withClient(async (client) => {
        const result = await client.query(
          'SELECT * FROM content_assets WHERE organization_id = $1 ORDER BY updated_at DESC',
          [organizationId],
        );
        return result.rows.map((row) => mapContentAsset(row));
      });
    },
    updateContentAsset(input) {
      return withClient(async (client) => {
        const result = await client.query(
          `UPDATE content_assets
           SET license_status = $3, notes = $4, updated_at = $5
           WHERE organization_id = $1 AND id = $2
           RETURNING *`,
          [input.organizationId, input.assetId, input.licenseStatus, input.notes, new Date().toISOString()],
        );
        if (!result.rows[0]) {
          throw new SaasApiError(404, 'content_asset_not_found', '内容资产不存在。');
        }
        return mapContentAsset(result.rows[0]);
      });
    },
    createDataRequest(input) {
      return withClient(async (client) => {
        const now = new Date().toISOString();
        const result = await client.query(
          `INSERT INTO data_requests
           (id, organization_id, user_id, request_type, status, note, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'queued', $5, $6, $6)
           RETURNING *`,
          [crypto.randomUUID(), input.organizationId, input.userId, input.requestType, input.note, now],
        );
        return mapDataRequest(result.rows[0]);
      });
    },
    listDataRequests(input) {
      return withClient(async (client) => {
        const result = input.userId
          ? await client.query(
            'SELECT * FROM data_requests WHERE organization_id = $1 AND user_id = $2 ORDER BY created_at DESC',
            [input.organizationId, input.userId],
          )
          : await client.query(
            'SELECT * FROM data_requests WHERE organization_id = $1 ORDER BY created_at DESC',
            [input.organizationId],
          );
        return result.rows.map((row) => mapDataRequest(row));
      });
    },
    resolveDataRequest(input) {
      return withClient(async (client) => {
        const now = new Date().toISOString();
        const completedAt = input.status === 'completed' || input.status === 'rejected' ? now : null;
        const result = await client.query(
          `UPDATE data_requests
           SET status = $3, note = $4, updated_at = $5, completed_at = $6
           WHERE organization_id = $1 AND id = $2
           RETURNING *`,
          [input.organizationId, input.requestId, input.status, input.note, now, completedAt],
        );
        if (!result.rows[0]) {
          throw new SaasApiError(404, 'data_request_not_found', '数据请求不存在。');
        }
        return mapDataRequest(result.rows[0]);
      });
    },
    getOrganizationAdminOverview(organizationId) {
      return withClient(async (client) => {
        const result = await client.query(
          `SELECT
             (SELECT count(*)::int FROM users WHERE organization_id = $1) AS members,
             (SELECT count(*)::int FROM organization_invitations WHERE organization_id = $1 AND accepted_at IS NULL AND expires_at > now()) AS pending_invitations,
             (SELECT count(*)::int FROM learning_snapshots WHERE organization_id = $1) AS learning_snapshots,
             (SELECT count(*)::int FROM learning_entities WHERE organization_id = $1 AND deleted_at IS NULL) AS learning_entities,
             (SELECT count(*)::int FROM sessions WHERE organization_id = $1 AND revoked_at IS NULL AND expires_at > now()) AS active_sessions,
             (SELECT count(*)::int FROM content_assets WHERE organization_id = $1) AS content_assets,
             (SELECT count(*)::int FROM content_assets WHERE organization_id = $1 AND license_status = 'blocked') AS blocked_content_assets,
             (SELECT count(*)::int FROM data_requests WHERE organization_id = $1 AND status IN ('queued', 'processing')) AS open_data_requests`,
          [organizationId],
        );
        const row = result.rows[0] as Record<string, unknown>;
        return {
          members: Number(row.members),
          pendingInvitations: Number(row.pending_invitations),
          learningSnapshots: Number(row.learning_snapshots),
          learningEntities: Number(row.learning_entities),
          activeSessions: Number(row.active_sessions),
          contentAssets: Number(row.content_assets),
          blockedContentAssets: Number(row.blocked_content_assets),
          openDataRequests: Number(row.open_data_requests),
        };
      });
    },
  };
}
