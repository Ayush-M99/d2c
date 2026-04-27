-- 002_create_nominations.sql

CREATE TABLE IF NOT EXISTS venue_nominations (
  nomination_id   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggested_name  VARCHAR(200)  NOT NULL,
  location        GEOGRAPHY(Point, 4326) NOT NULL,
  nominated_by    VARCHAR(64)   NOT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  venue_id        UUID          REFERENCES venues(venue_id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ   NULL
);

CREATE INDEX IF NOT EXISTS idx_nominations_location
  ON venue_nominations USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_nominations_status
  ON venue_nominations (status);
