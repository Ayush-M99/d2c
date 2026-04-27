// Demo overlay data anchored around Udupi / Manipal.

export type ZoneId = 'food' | 'nightlife' | 'culture' | 'outdoors' | 'transit'

export const ZONE_COLORS: Record<ZoneId, string> = {
  food: '#FF6B35',
  nightlife: '#FF3CAC',
  culture: '#8B5CF6',
  outdoors: '#06D6A0',
  transit: '#4CC9F0',
}

export interface ZoneMeta {
  id: ZoneId
  label: string
  emoji: string
}

export const ZONES_META: ZoneMeta[] = [
  { id: 'food', label: 'Food & Drink', emoji: 'food' },
  { id: 'nightlife', label: 'Evenings', emoji: 'night' },
  { id: 'culture', label: 'Campus & Culture', emoji: 'art' },
  { id: 'outdoors', label: 'Parks & Outdoors', emoji: 'green' },
  { id: 'transit', label: 'Transit & Local', emoji: 'bus' },
]

export interface ZoneStats {
  threads: number
  active: number
  peak: string
  topTags: string[]
  hourly: number[]
}

export interface MapZone {
  id: ZoneId
  label: string
  color: string
  center: [number, number]
  polygon: [number, number][]
  stats: ZoneStats
}

export const MAP_ZONES: MapZone[] = [
  {
    id: 'food',
    label: 'Tiger Circle Eats',
    color: '#FF6B35',
    center: [13.3527, 74.7926],
    polygon: [
      [13.3545, 74.7898],
      [13.3554, 74.7944],
      [13.3529, 74.7965],
      [13.3503, 74.7947],
      [13.3501, 74.7905],
    ],
    stats: {
      threads: 3,
      active: 36,
      peak: '8pm',
      topTags: ['cafe', 'snacks', 'student-food'],
      hourly: [2, 1, 1, 0, 0, 1, 3, 5, 8, 12, 15, 18, 22, 28, 32, 36, 34, 30, 38, 42, 35, 22, 14, 6],
    },
  },
  {
    id: 'nightlife',
    label: 'End Point Evenings',
    color: '#FF3CAC',
    center: [13.3602, 74.7912],
    polygon: [
      [13.3622, 74.7887],
      [13.363, 74.7935],
      [13.3605, 74.7952],
      [13.358, 74.7934],
      [13.3584, 74.789],
    ],
    stats: {
      threads: 2,
      active: 51,
      peak: '7pm',
      topTags: ['walk', 'sunset', 'hangout'],
      hourly: [1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 5, 8, 10, 12, 15, 20, 24, 30, 38, 45, 51, 48, 32, 12],
    },
  },
  {
    id: 'culture',
    label: 'MAHE Campus',
    color: '#8B5CF6',
    center: [13.3482, 74.786],
    polygon: [
      [13.3508, 74.7832],
      [13.3514, 74.7888],
      [13.3487, 74.7902],
      [13.3457, 74.7884],
      [13.3456, 74.784],
    ],
    stats: {
      threads: 2,
      active: 24,
      peak: '6pm',
      topTags: ['campus', 'events', 'workshop'],
      hourly: [0, 0, 0, 0, 0, 0, 1, 2, 4, 8, 12, 16, 18, 20, 22, 24, 22, 20, 18, 14, 10, 6, 3, 1],
    },
  },
  {
    id: 'outdoors',
    label: 'Manipal Lake',
    color: '#06D6A0',
    center: [13.365, 74.7872],
    polygon: [
      [13.3673, 74.7846],
      [13.3679, 74.79],
      [13.3654, 74.7915],
      [13.3628, 74.7898],
      [13.3627, 74.7852],
    ],
    stats: {
      threads: 1,
      active: 8,
      peak: '7am',
      topTags: ['walk', 'run', 'lake'],
      hourly: [2, 1, 0, 0, 0, 4, 8, 12, 10, 8, 6, 4, 3, 3, 4, 5, 6, 8, 7, 5, 3, 2, 2, 2],
    },
  },
  {
    id: 'transit',
    label: 'Udupi Bus Link',
    color: '#4CC9F0',
    center: [13.3409, 74.7421],
    polygon: [
      [13.343, 74.739],
      [13.3435, 74.7445],
      [13.3412, 74.746],
      [13.3387, 74.744],
      [13.3385, 74.7398],
    ],
    stats: {
      threads: 1,
      active: 22,
      peak: '9am',
      topTags: ['bus', 'traffic', 'local'],
      hourly: [3, 2, 1, 1, 0, 2, 8, 18, 22, 20, 16, 14, 12, 10, 12, 15, 18, 20, 22, 18, 12, 8, 5, 3],
    },
  },
]

export interface D2cThread {
  id: number
  title: string
  tags: string[]
  active: number
  ago: string
  participants: string[]
  lastMessage: string
  emoji: string
  zone: ZoneId
  lat: number
  lng: number
}

export const D2C_THREADS: D2cThread[] = [
  {
    id: 1,
    title: 'Tiger Circle cafe crowd?',
    tags: ['cafe', 'coffee'],
    active: 14,
    ago: 'now',
    participants: ['BraveOtter', 'QuietWolf', 'NeonFox', 'StormCrow', 'GlassHawk'],
    lastMessage: 'near the circle, filter coffee line is moving fast',
    emoji: 'cafe',
    zone: 'food',
    lat: 13.3527,
    lng: 74.7926,
  },
  {
    id: 2,
    title: 'End Point walk later?',
    tags: ['walk', 'sunset'],
    active: 32,
    ago: '1m',
    participants: ['WildLynx', 'SaltRidge', 'IronDawn'],
    lastMessage: 'sunset side is breezy, anyone heading there?',
    emoji: 'walk',
    zone: 'nightlife',
    lat: 13.3602,
    lng: 74.7912,
  },
  {
    id: 3,
    title: 'Manipal Lake drizzle walk',
    tags: ['outdoors', 'lake'],
    active: 8,
    ago: '3m',
    participants: ['MistPine', 'DuskBird'],
    lastMessage: 'drizzling but the lake path looks perfect',
    emoji: 'rain',
    zone: 'outdoors',
    lat: 13.365,
    lng: 74.7872,
  },
  {
    id: 4,
    title: 'Late night snacks near MIT',
    tags: ['food', 'latenight'],
    active: 11,
    ago: '2m',
    participants: ['RedCoral', 'SandPeak', 'NightOwl'],
    lastMessage: 'one stall near the gate is still open',
    emoji: 'snack',
    zone: 'food',
    lat: 13.351,
    lng: 74.791,
  },
  {
    id: 5,
    title: 'Udupi bus timing?',
    tags: ['local', 'bus'],
    active: 22,
    ago: '4m',
    participants: ['CalmReed', 'StoneLeaf', 'AshWren', 'TideCliff'],
    lastMessage: 'anyone know if the next bus is packed?',
    emoji: 'bus',
    zone: 'transit',
    lat: 13.3409,
    lng: 74.7421,
  },
  {
    id: 6,
    title: 'Campus open mic tonight',
    tags: ['music', 'culture'],
    active: 19,
    ago: '5m',
    participants: ['VoidPulse', 'SilkRain', 'NightBloom'],
    lastMessage: 'starts at 8:30, get there early for seats',
    emoji: 'mic',
    zone: 'culture',
    lat: 13.3482,
    lng: 74.786,
  },
  {
    id: 7,
    title: 'Workshop near MAHE',
    tags: ['art', 'workshop'],
    active: 5,
    ago: '8m',
    participants: ['ClayHand', 'GoldSpark'],
    lastMessage: 'small weekend workshop, seats filling up',
    emoji: 'art',
    zone: 'culture',
    lat: 13.349,
    lng: 74.787,
  },
]

export const YOU_LAT = 13.3525
export const YOU_LNG = 74.7928
export const MAP_CENTER: [number, number] = [13.3525, 74.7928]
export const MAP_ZOOM = 14

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatD2c(meters: number): string {
  const mins = Math.round(meters / 80)
  if (mins < 1) return '< 1 min'
  if (mins <= 25) return `${mins} min`
  return `${(meters / 1000).toFixed(1)} km`
}

export type LayerToggles = Record<ZoneId, boolean>

export const ALL_LAYERS_ON: LayerToggles = {
  food: true,
  nightlife: true,
  culture: true,
  outdoors: true,
  transit: true,
}
