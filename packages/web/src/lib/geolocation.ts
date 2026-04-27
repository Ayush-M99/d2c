export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
  speed: number
}

export function checkPermission(): Promise<PermissionState> {
  return navigator.permissions
    .query({ name: 'geolocation' })
    .then(r => r.state)
    .catch(() => 'prompt' as PermissionState)
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed ?? 0,
      }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    )
  })
}

export function watchPosition(
  onUpdate: (pos: GeoPosition) => void,
  onError?: (err: GeolocationPositionError) => void,
): number {
  return navigator.geolocation.watchPosition(
    pos => onUpdate({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed ?? 0,
    }),
    onError,
    { enableHighAccuracy: true, maximumAge: 5000 },
  )
}

export function clearWatch(id: number) {
  navigator.geolocation.clearWatch(id)
}
