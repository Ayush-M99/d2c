interface Props {
  value: string
}

export function D2cChip({ value }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(139, 92, 246, 0.12)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        borderRadius: 9999,
        padding: '3px 10px',
        animation: 'd2c-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          color: 'var(--color-primary)',
          letterSpacing: '0.02em',
        }}
      >
        d2c: {value}
      </span>
      <span style={{ fontSize: 10, color: 'var(--color-primary)', opacity: 0.7 }}>↗</span>
    </div>
  )
}
