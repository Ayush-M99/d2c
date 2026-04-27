import { useEffect } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { useLocationStore } from '../store/locationStore'
import { getSocket } from '../lib/socket'
import { emitManipalLocation } from '../lib/liveLocation'

export function useGeo() {
  const sessionId = useSessionStore((s) => s.sessionId)
  const setPermissionState = useLocationStore((s) => s.setPermissionState)

  useEffect(() => {
    if (!sessionId) return

    const socket = getSocket()
    const syncManipal = () => {
      emitManipalLocation()
      setPermissionState('granted')
    }

    syncManipal()
    socket?.on('connect', syncManipal)

    return () => {
      socket?.off('connect', syncManipal)
    }
  }, [sessionId, setPermissionState])
}
