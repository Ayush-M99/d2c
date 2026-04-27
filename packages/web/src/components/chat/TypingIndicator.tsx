interface Props {
  names: string[]
}

export function TypingIndicator({ names }: Props) {
  if (names.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 16px',
      }}
    >
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-text-muted)',
              animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
        {names.length === 1 ? names[0] : `${names.length} people`} typing…
      </span>
    </div>
  )
}
