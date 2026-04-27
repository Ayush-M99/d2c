import { Menu } from 'lucide-react'
import { useNavigate } from 'react-router'
import { D2cChip } from './D2cChip'
import { useD2c } from '../../hooks/useD2c'
import { useUIStore } from '../../store/uiStore'

interface Props {
  showBack?: boolean
  title?: string
  rightSlot?: React.ReactNode
}

export function TopBar({ showBack = false, title = 'd2c', rightSlot }: Props) {
  const navigate = useNavigate()
  const d2c = useD2c()
  const d2cTarget = useUIStore((s) => s.d2cTarget)
  const darkMode = useUIStore((s) => s.darkMode)
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 54,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 8,
        background: darkMode ? 'rgba(10,10,18,0.85)' : 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${darkMode ? 'rgba(42,42,64,0.5)' : 'rgba(0,0,0,0.06)'}`,
        zIndex: 1002,
        justifyContent: 'space-between',
      }}
    >
      {/* Left: back or menu */}
      {showBack ? (
        <button
          aria-label="back"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'inherit',
          }}
        >
          ←
        </button>
      ) : (
        <button
          aria-label="menu"
          onClick={() => navigate('/venues')}
          style={{
            background: 'none',
            border: 'none',
            color: darkMode ? 'var(--color-text-secondary)' : '#666',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            fontSize: 20,
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
      )}

      {/* Center: logo + d2c chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-pink))',
              boxShadow: '0 0 8px var(--color-primary-glow)',
            }}
          />
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: darkMode ? 'var(--color-text-primary)' : '#111',
              letterSpacing: '-0.03em',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {title}
          </span>
        </div>

        {d2cTarget && d2c && <D2cChip value={d2c} />}
      </div>

      {/* Right: theme toggle or custom slot */}
      {rightSlot ?? (
        <button
          aria-label={darkMode ? 'switch to light mode' : 'switch to dark mode'}
          onClick={toggleDarkMode}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: darkMode ? 'var(--color-surface-overlay)' : '#fff',
            border: `1px solid ${darkMode ? 'var(--color-border)' : 'rgba(0,0,0,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 18,
            transition: 'all 0.3s',
            flexShrink: 0,
            boxShadow: darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
            fontFamily: 'inherit',
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      )}
    </div>
  )
}
