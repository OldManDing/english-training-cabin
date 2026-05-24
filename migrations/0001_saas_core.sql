-- English Training Cabin SaaS core schema.
-- Expand migration: additive tables for accounts, tenants, subscriptions, tokens, and cloud learning data.

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

INSERT INTO saas_migrations (id)
VALUES ('0001_saas_core')
ON CONFLICT (id) DO NOTHING;
