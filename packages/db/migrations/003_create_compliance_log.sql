-- 003_create_compliance_log.sql
-- Stores moderation actions for regulatory compliance (GDPR, CSAM, etc.)
-- Retained for the minimum statutory period; no message content stored.

CREATE TABLE IF NOT EXISTS compliance_log (
  log_id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type      VARCHAR(50)   NOT NULL,    -- 'message_removed', 'session_banned', etc.
  session_hash     VARCHAR(64)   NOT NULL,    -- SHA-256 of session_id (not raw)
  fingerprint_hash VARCHAR(64)   NOT NULL,    -- SHA-256 of device fingerprint
  thread_id        UUID          NULL,
  message_id       VARCHAR(26)   NULL,        -- ULID if applicable
  reason           VARCHAR(200)  NOT NULL,
  geohash          VARCHAR(12)   NULL,        -- coarsened to precision 4 (privacy)
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_session
  ON compliance_log (session_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_action
  ON compliance_log (action_type, created_at DESC);
