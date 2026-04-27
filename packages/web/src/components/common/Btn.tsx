import { useState, type CSSProperties, type ReactNode } from 'react'

type Variant = 'primary' | 'cyan' | 'orange' | 'ghost' | 'gold'

interface BtnProps {
  children: ReactNode
  variant?: Variant
  onClick?: () => void
  disabled?: boolean
  style?: CSSProperties
}

const VARIANTS: Record<Variant, { bg: string; c: string; shadow: string; border?: string }> = {
  primary: { bg: 'var(--d2c-violet)', c: '#fff', shadow: '0 0 24px var(--d2c-violet-glow)' },
  cyan: { bg: 'var(--d2c-cyan)', c: '#0A0A12', shadow: '0 0 24px var(--d2c-cyan-glow)' },
  orange: { bg: 'var(--d2c-orange)', c: '#fff', shadow: '0 0 24px var(--d2c-orange-glow)' },
  ghost: { bg: 'transparent', c: 'var(--d2c-text-2)', border: '1.5px solid var(--d2c-border)', shadow: 'none' },
  gold: {
    bg: 'linear-gradient(135deg,#FFD166,#FF6B35)',
    c: '#0A0A12',
    shadow: '0 0 30px rgba(255,209,102,0.3)',
  },
}

export function Btn({ children, variant = 'primary', onClick, disabled, style }: BtnProps) {
  const [pressed, setPressed] = useState(false)
  const v = VARIANTS[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        padding: '0 22px',
        fontSize: 14,
        fontWeight: 700,
        fontFamily: 'inherit',
        borderRadius: 'var(--d2c-r-full)',
        background: v.bg,
        color: v.c,
        border: v.border ?? 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: pressed ? 'none' : v.shadow,
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'all 0.15s',
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
