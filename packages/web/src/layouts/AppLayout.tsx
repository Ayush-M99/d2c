import { Outlet } from 'react-router'
import { useGeo } from '../hooks/useGeo'

export function AppLayout() {
  useGeo()

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Outlet />
    </div>
  )
}
