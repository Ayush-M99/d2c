import { useUIStore } from '../../store/uiStore'
import type { MapZone } from '../../lib/mapData'
import { HeatmapGrid, MiniBarChart, Sparkline } from './charts'

interface Props {
  zone: MapZone
  onClose: () => void
}

export function ZonePopover({ zone, onClose }: Props) {
  const darkMode = useUIStore((s) => s.darkMode)
  const bg = darkMode ? 'rgba(10,10,20,0.96)' : 'rgba(255,255,255,0.98)'
  const text = darkMode ? '#F0F0F8' : '#111'
  const text2 = darkMode ? '#A0A0BE' : '#555'
  const text3 = darkMode ? '#606080' : '#999'
  const surfBg = darkMode ? 'rgba(20,20,35,0.8)' : '#F5F5F8'
  const cellBorder = darkMode ? 'rgba(42,42,64,0.5)' : 'rgba(0,0,0,0.05)'

  const max = Math.max(...zone.stats.hourly, 1)
  const heatData = Array.from({ length: 7 }, () =>
    zone.stats.hourly.map((v) => Math.min(1, (v / max) * (0.8 + Math.random() * 0.4))),
  )
  const categories = [
    { label: 'Chat', value: Math.round(zone.stats.active * 0.45), color: zone.color },
    { label: 'Poll', value: Math.round(zone.stats.active * 0.25), color: '#FFD166' },
    { label: 'Q&A', value: Math.round(zone.stats.active * 0.2), color: '#4CC9F0' },
    { label: 'Event', value: Math.round(zone.stats.active * 0.1), color: '#06D6A0' },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${zone.color}44`,
          borderRadius: 20,
          padding: 20,
          width: '92%',
          maxWidth: 360,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${zone.color}15`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: zone.color,
                boxShadow: `0 0 12px ${zone.color}`,
              }}
            />
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: text,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {zone.label}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: text3,
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {[
            { v: zone.stats.active, l: 'active now', c: zone.color },
            { v: zone.stats.threads, l: 'threads', c: text },
            { v: zone.stats.peak, l: 'peak hour', c: '#FFD166' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: surfBg,
                borderRadius: 10,
                padding: '10px 12px',
                border: `1px solid ${cellBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: s.c,
                  lineHeight: 1,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {s.v}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: text3,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: 4,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <SectionLabel text2={text2}>Activity · 24h</SectionLabel>
        <ChartCell surfBg={surfBg} cellBorder={cellBorder}>
          <Sparkline data={zone.stats.hourly} color={zone.color} width={300} height={40} />
          <RangeAxis text3={text3} />
        </ChartCell>

        <SectionLabel text2={text2}>Weekly Heatmap</SectionLabel>
        <ChartCell surfBg={surfBg} cellBorder={cellBorder}>
          <HeatmapGrid data={heatData} width={300} height={42} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span
                key={d}
                style={{
                  fontSize: 7,
                  color: text3,
                  fontFamily: "'JetBrains Mono', monospace",
                  width: 40,
                  textAlign: 'center',
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </ChartCell>

        <SectionLabel text2={text2}>Thread Types</SectionLabel>
        <ChartCell surfBg={surfBg} cellBorder={cellBorder}>
          <MiniBarChart
            labels={categories.map((c) => c.label)}
            values={categories.map((c) => c.value)}
            colors={categories.map((c) => c.color)}
            width={300}
            height={36}
          />
        </ChartCell>

        <div style={{ display: 'flex', gap: 5, marginTop: 12, flexWrap: 'wrap' }}>
          {zone.stats.topTags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 12,
                background: `${zone.color}15`,
                color: zone.color,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                border: `1px solid ${zone.color}33`,
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ text2, children }: { text2: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: text2,
        marginBottom: 6,
        marginTop: 12,
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

function ChartCell({
  surfBg,
  cellBorder,
  children,
}: {
  surfBg: string
  cellBorder: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: surfBg,
        borderRadius: 10,
        padding: 10,
        border: `1px solid ${cellBorder}`,
      }}
    >
      {children}
    </div>
  )
}

function RangeAxis({ text3 }: { text3: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
      {['12a', '6a', '12p', '6p', '12a'].map((l) => (
        <span
          key={l}
          style={{
            fontSize: 8,
            color: text3,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {l}
        </span>
      ))}
    </div>
  )
}
