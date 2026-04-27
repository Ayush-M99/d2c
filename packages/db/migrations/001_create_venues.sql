-- 001_create_venues.sql
-- Requires PostGIS extension (provided by postgis/postgis:16-3.4 image)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS venues (
  venue_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(200)  NOT NULL,
  category          VARCHAR(50)   NOT NULL DEFAULT 'other',
  location          GEOGRAPHY(Point, 4326) NOT NULL,
  radius_meters     NUMERIC(8, 2) NOT NULL DEFAULT 50,
  nominated_by      VARCHAR(64)   NOT NULL,   -- SHA-256 fingerprint hash
  approved_at       TIMESTAMPTZ   NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_location
  ON venues USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_venues_approved
  ON venues (approved_at)
  WHERE approved_at IS NOT NULL;
