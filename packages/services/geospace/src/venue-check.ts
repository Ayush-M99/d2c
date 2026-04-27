import type { Pool } from 'pg';
import type { Coordinates } from '@chatspaces/shared';
import type { Venue } from '@chatspaces/shared';

/**
 * VenueChecker queries PostGIS for venues near a given location.
 * Used to enrich GeoSpace assignment with a venueId when the user
 * is inside a known venue boundary.
 */
export class VenueChecker {
  constructor(private readonly db: Pool) {}

  /**
   * Find the nearest approved venue within `radiusMeters` of `coords`.
   * Returns null if no venue is found.
   */
  async getNearestVenue(coords: Coordinates, radiusMeters = 100): Promise<Venue | null> {
    const result = await this.db.query<{
      venue_id: string;
      name: string;
      category: string;
      lat: number;
      lng: number;
      radius_meters: number;
      nominated_by: string;
      approved_at: string | null;
      created_at: string;
    }>(
      `
      SELECT
        venue_id,
        name,
        category,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng,
        radius_meters,
        nominated_by,
        approved_at,
        created_at
      FROM venues
      WHERE approved_at IS NOT NULL
        AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      LIMIT 1
      `,
      [coords.lng, coords.lat, radiusMeters],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0]!;
    return {
      venueId: row.venue_id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      radiusMeters: Number(row.radius_meters),
      category: row.category as Venue['category'],
      nominatedBy: row.nominated_by,
      approvedAt: row.approved_at ? new Date(row.approved_at).getTime() : null,
      createdAt: new Date(row.created_at).getTime(),
    };
  }

  /**
   * Find all approved venues within `radiusMeters`.
   */
  async getNearbyVenues(coords: Coordinates, radiusMeters = 500): Promise<Venue[]> {
    const result = await this.db.query<{
      venue_id: string;
      name: string;
      category: string;
      lat: number;
      lng: number;
      radius_meters: number;
      nominated_by: string;
      approved_at: string | null;
      created_at: string;
    }>(
      `
      SELECT
        venue_id,
        name,
        category,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng,
        radius_meters,
        nominated_by,
        approved_at,
        created_at
      FROM venues
      WHERE approved_at IS NOT NULL
        AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      LIMIT 20
      `,
      [coords.lng, coords.lat, radiusMeters],
    );

    return result.rows.map((row) => ({
      venueId: row.venue_id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      radiusMeters: Number(row.radius_meters),
      category: row.category as Venue['category'],
      nominatedBy: row.nominated_by,
      approvedAt: row.approved_at ? new Date(row.approved_at).getTime() : null,
      createdAt: new Date(row.created_at).getTime(),
    }));
  }

  /**
   * Nominate a new venue for review.
   */
  async nominateVenue(
    coords: Coordinates,
    suggestedName: string,
    fingerprintHash: string,
  ): Promise<string> {
    const result = await this.db.query<{ nomination_id: string }>(
      `
      INSERT INTO venue_nominations (suggested_name, location, nominated_by)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)
      RETURNING nomination_id
      `,
      [suggestedName, coords.lng, coords.lat, fingerprintHash],
    );
    return result.rows[0]!.nomination_id;
  }
}
