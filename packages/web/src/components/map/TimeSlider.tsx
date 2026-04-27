import { useUIStore } from '../../store/uiStore'

interface Props {
  value: number
  onChange: (h: number) => void
}

function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

export function TimeSlider({ value, onChange }: Props) {
  const darkMode = useUIStore((s) => s.darkMode)
  const bg = darkMode ? 'rgba(10,10,20,0.92)' : 'rgba(255,255,255,0.95)'
  const border = darkMode ? 'rgba(42,42,64,0.6)' : 'rgba(0,0,0,0.08)'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 128,
        left: 14,
        right: 60,
        zIndex: 1000,
        background: bg,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: '8px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: darkMode ? '#A0A0BE' : '#666',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Time
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--d2c-violet)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {hourLabel(value)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={23}
        step={1}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: 'var(--d2c-violet)', height: 4, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {['12a', '6a', '12p', '6p', '12a'].map((l, i) => (
          <span
            key={i}
            style={{
              fontSize: 7,
              color: darkMode ? '#606080' : '#bbb',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}
