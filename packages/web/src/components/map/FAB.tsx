import { useUIStore } from '../../store/uiStore'

export function FAB() {
  const snapNum = useUIStore((s) => s.sheetSnap)
  const setShowCreate = useUIStore((s) => s.setShowCreateThread)

  // Position above the bottom sheet at each snap
  const bottom = snapNum === 0 ? 138 : snapNum === 1 ? 'calc(50% + 16px)' : 'calc(88% + 16px)'

  return (
    <button
      aria-label="create thread"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setShowCreate(true)
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{
        position: 'absolute',
        bottom,
        right: 14,
        zIndex: 1200,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--d2c-violet), var(--d2c-pink))',
        border: 'none',
        color: '#fff',
        fontSize: 26,
        fontWeight: 300,
        cursor: 'pointer',
        boxShadow: '0 0 30px var(--d2c-violet-glow), 0 8px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'bottom 0.4s cubic-bezier(0.32,0.72,0,1), transform 0.2s',
        fontFamily: 'inherit',
      }}
    >
      +
    </button>
  )
}
