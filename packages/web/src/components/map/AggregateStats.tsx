import { useUIStore } from '../../store/uiStore'
import type { MapZone } from '../../lib/mapData'

interface Props {
  zones: MapZone[]
  currentHour: number
}

export function AggregateStats({ zones, currentHour }: Props) {
  const darkMode = useUIStore((s) => s.darkMode)
  const totalActive = zones.reduce((a, z) => a + z.stats.hourly[currentHour], 0)
  const totalThreads = zones.reduce((a, z) => a + z.stats.threads, 0)
  const hottest = zones.reduce(
    (a, z) => (z.stats.hourly[currentHour] > a.stats.hourly[currentHour] ? z : a),
    zones[0],
  )
  const border = darkMode ? 'rgba(42,42,64,0.5)' : 'rgba(0,0,0,0.06)'
  const text3 = darkMode ? '#606080' : '#999'

  const items: { v: string | number; l: string; c: string; icon: string }[] = [
    { v: totalActive, l: 'chatting', c: 'var(--d2c-cyan)', icon: '💬' },
    { v: totalThreads, l: 'threads', c: 'var(--d2c-violet)', icon: '🧵' },
    { v: hottest?.label.split(' ')[0] ?? '—', l: 'hottest', c: hottest?.color ?? '#fff', icon: '🔥' },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 2px', marginBottom: 10 }}>
      {items.map((s, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            background: darkMode ? 'var(--d2c-surface)' : '#fff',
            borderRadius: 10,
            padding: '8px 10px',
            border: `1px solid ${border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12 }}>{s.icon}</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: s.c,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {s.v}
            </span>
          </div>
          <div
            style={{
              fontSize: 8,
              color: text3,
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: 2,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {s.l}
          </div>
        </div>
      ))}
    </div>
  )
}
