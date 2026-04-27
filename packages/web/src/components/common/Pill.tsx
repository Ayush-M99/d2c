interface PillProps {
  label: string
  color?: string
  glow?: boolean
  small?: boolean
}

export function Pill({ label, color, glow, small }: PillProps) {
  const c = color || 'var(--d2c-violet)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        background: `${c}18`,
        color: c,
        border: `1px solid ${c}44`,
        borderRadius: 'var(--d2c-r-full)',
        padding: small ? '1px 7px' : '3px 10px',
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        boxShadow: glow ? `0 0 12px ${c}22` : 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}
