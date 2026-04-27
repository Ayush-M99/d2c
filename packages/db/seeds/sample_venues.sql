-- sample_venues.sql — Development seed data only. Do NOT run in production.

INSERT INTO venues (name, category, location, radius_meters, nominated_by, approved_at)
VALUES
  ('Central Park Coffee', 'cafe',
   ST_SetSRID(ST_MakePoint(-73.9665, 40.7812), 4326)::geography,
   30, 'dev_seed_fingerprint', NOW()),

  ('Main Street Library', 'library',
   ST_SetSRID(ST_MakePoint(-73.9850, 40.7580), 4326)::geography,
   50, 'dev_seed_fingerprint', NOW()),

  ('Union Square', 'park',
   ST_SetSRID(ST_MakePoint(-73.9897, 40.7359), 4326)::geography,
   100, 'dev_seed_fingerprint', NOW()),

  ('Grand Central Transit Hub', 'transit',
   ST_SetSRID(ST_MakePoint(-73.9772, 40.7527), 4326)::geography,
   80, 'dev_seed_fingerprint', NOW()),

  ('NYU Campus Bar', 'bar',
   ST_SetSRID(ST_MakePoint(-73.9965, 40.7295), 4326)::geography,
   25, 'dev_seed_fingerprint', NOW())
ON CONFLICT DO NOTHING;
