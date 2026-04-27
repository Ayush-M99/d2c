import type { ReactNode } from 'react'
import { useUIStore } from '../../store/uiStore'

type SnapState = 'collapsed' | 'half' | 'full'

const SNAP_HEIGHTS: Record<SnapState, string> = {
  collapsed: '118px',
  half: '50%',
  full: '88%',
}

const SNAP_FROM_NUM: Record<0 | 1 | 2, SnapState> = { 0: 'collapsed', 1: 'half', 2: 'full' }
const SNAP_TO_NUM: Record<SnapState, 0 | 1 | 2> = { collapsed: 0, half: 1, full: 2 }

interface Props {
  children: ReactNode
}

export function BottomSheet({ children }: Props) {
  const snapNum = useUIStore((s) => s.sheetSnap)
  const setSnapNum = useUIStore((s) => s.setSheetSnap)
  const darkMode = useUIStore((s) => s.darkMode)

  const snap = SNAP_FROM_NUM[snapNum]
  const cycle = () =>
    setSnapNum(SNAP_TO_NUM[snap === 'collapsed' ? 'half' : snap === 'half' ? 'full' : 'collapsed'])

  const bg = darkMode ? 'rgba(10,10,18,0.96)' : 'rgba(255,255,255,0.97)'
  const border = darkMode ? 'var(--d2c-border)' : 'rgba(0,0,0,0.08)'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SNAP_HEIGHTS[snap],
        background: bg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '22px 22px 0 0',
        border: `1px solid ${border}`,
        borderBottom: 'none',
        transition: 'height 0.4s cubic-bezier(0.32,0.72,0,1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1001,
        boxShadow: darkMode ? '0 -12px 60px rgba(0,0,0,0.6)' : '0 -8px 40px rgba(0,0,0,0.08)',
      }}
    >
      {/* Drag handle */}
      <div
        style={{ padding: '10px 0 6px', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}
        onClick={cycle}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: darkMode
              ? 'linear-gradient(90deg, var(--d2c-violet), var(--d2c-pink))'
              : 'rgba(0,0,0,0.15)',
            margin: '0 auto',
            opacity: darkMode ? 0.5 : 1,
          }}
        />
      </div>

      {children}
    </div>
  )
}
