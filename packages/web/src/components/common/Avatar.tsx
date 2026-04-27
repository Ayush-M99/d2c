export function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const VIBE_COLORS = ['#8B5CF6', '#06D6A0', '#FF6B35', '#FF3CAC', '#FFD166', '#4CC9F0', '#EF4444', '#F97316']

export function vibeColor(name: string): string {
  return VIBE_COLORS[hashStr(name || '') % VIBE_COLORS.length]
}

interface AvatarProps {
  name?: string
  size?: number
}

export function Avatar({ name = '', size = 40 }: AvatarProps) {
  const h = hashStr(name)
  const hue1 = h % 360
  const hue2 = (h * 137) % 360
  const bg = `oklch(0.22 0.06 ${hue1})`
  const c1 = `oklch(0.70 0.22 ${hue1})`
  const c2 = `oklch(0.60 0.18 ${hue2})`
  const s = size
  const cx = s / 2
  const cy = s / 2
  const r = s * 0.34
  const shape = h % 4

  const ring = (n: number, scale: number): [number, number][] =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      return [cx + Math.cos(a) * r * scale, cy + Math.sin(a) * r * scale]
    })

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ borderRadius: '50%', flexShrink: 0 }}>
      <defs>
        <radialGradient id={`ag${h}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.9" />
          <stop offset="100%" stopColor={bg} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={s / 2} fill={`url(#ag${h})`} />
      {shape === 0 && (
        <polygon points={ring(3, 1).map((p) => p.join(',')).join(' ')} fill={c1} opacity="0.85" />
      )}
      {shape === 1 && (
        <polygon points={ring(6, 1).map((p) => p.join(',')).join(' ')} fill={c1} opacity="0.7" />
      )}
      {shape === 2 && (
        <polygon points={ring(4, 1).map((p) => p.join(',')).join(' ')} fill={c2} opacity="0.8" />
      )}
      {shape === 3 && (
        <>
          <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke={c1} strokeWidth={2} opacity="0.7" />
          <circle cx={cx} cy={cy} r={r * 0.5} fill={c2} opacity="0.6" />
        </>
      )}
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#fff" opacity="0.8" />
    </svg>
  )
}

interface AvatarStackProps {
  names?: string[]
  size?: number
}

export function AvatarStack({ names = [], size = 28 }: AvatarStackProps) {
  const shown = names.slice(0, 3)
  const extra = names.length - shown.length
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((n, i) => (
        <div
          key={i}
          style={{
            marginLeft: i ? -size * 0.3 : 0,
            zIndex: shown.length - i,
            borderRadius: '50%',
            border: '2px solid var(--d2c-surface)',
          }}
        >
          <Avatar name={n} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -size * 0.3,
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'var(--d2c-surface-3)',
            border: '2px solid var(--d2c-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.32,
            color: 'var(--d2c-text-2)',
            fontWeight: 700,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
