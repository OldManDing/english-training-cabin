-- Non-payment commercial operations: device sessions, content governance, and data-rights requests.
-- Additive migration: no existing learning data or account data is modified.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_address text;

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

INSERT INTO saas_migrations (id)
VALUES ('0003_commercial_ops')
ON CONFLICT (id) DO NOTHING;
