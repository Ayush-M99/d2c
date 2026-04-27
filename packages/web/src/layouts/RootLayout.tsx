import type { ReactNode } from 'react'
import { useBootstrap } from '../hooks/useBootstrap'
import { useSocket } from '../hooks/useSocket'
import { ToastStack } from '../components/common/Toast'

export function RootLayout({ children }: { children?: ReactNode }) {
  useBootstrap()
  useSocket()

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--color-surface)' }}>
      {children}
      <ToastStack />
    </div>
  )
}
