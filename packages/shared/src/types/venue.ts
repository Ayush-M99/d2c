export type VenueCategory =
  | 'cafe'
  | 'bar'
  | 'park'
  | 'library'
  | 'gym'
  | 'transit'
  | 'university'
  | 'other';

export interface Venue {
  venueId: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  category: VenueCategory;
  nominatedBy: string; // device fingerprint hash
  approvedAt: number | null;
  createdAt: number;
}

export interface VenueNomination {
  nominationId: string;
  lat: number;
  lng: number;
  suggestedName: string;
  nominatedBy: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
}
