import { getSocket } from './socket'
import { api } from './api'
import { YOU_LAT, YOU_LNG } from './mapData'
import { useLocationStore } from '../store/locationStore'
import { useThreadStore } from '../store/threadStore'

export const MANIPAL_LOCATION = {
  lat: YOU_LAT,
  lng: YOU_LNG,
  accuracy: 75,
}

export function emitManipalLocation() {
  useLocationStore.getState().setLocation(
    MANIPAL_LOCATION.lat,
    MANIPAL_LOCATION.lng,
    MANIPAL_LOCATION.accuracy,
  )

  getSocket()?.emit('location_update', {
    lat: MANIPAL_LOCATION.lat,
    lng: MANIPAL_LOCATION.lng,
    accuracy: MANIPAL_LOCATION.accuracy,
    speed: null,
  })
}

export function ensureManipalGeospace(timeoutMs = 4000): Promise<string | null> {
  // Fast path: geospaceId already confirmed from a prior geospace_update
  const cached = useLocationStore.getState().geospaceId
  if (cached) return Promise.resolve(cached)

  const socket = getSocket()

  return new Promise((resolve) => {
    let settled = false

    const finish = (geospaceId: string | null) => {
      if (settled) return
      settled = true
      socket?.off('geospace_update', handleUpdate)
      resolve(geospaceId)
    }

    const handleUpdate = (data: any) => {
      finish(data?.geospaceId ?? useLocationStore.getState().geospaceId)
    }

    socket?.on('geospace_update', handleUpdate)
    emitManipalLocation()

    api
      .getGeospace(MANIPAL_LOCATION.lat, MANIPAL_LOCATION.lng)
      .then(({ geospace, threads }) => {
        const geospaceId = geospace?.geospaceId ?? null
        if (geospaceId) {
          useLocationStore.getState().setGeospaceId(geospaceId)
          useLocationStore.getState().setGeospaceCenter(MANIPAL_LOCATION.lat, MANIPAL_LOCATION.lng)
          useThreadStore.getState().setHot(threads ?? [])
          useThreadStore.getState().setNearby(threads ?? [])
        }
        finish(geospaceId)
      })
      .catch(() => {
        // REST failed — still wait for the socket path; timeout is the backstop
      })

    window.setTimeout(() => {
      finish(useLocationStore.getState().geospaceId)
    }, timeoutMs)
  })
}
