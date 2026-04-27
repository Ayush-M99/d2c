import { useMemo } from 'react'
import { useUIStore } from '../store/uiStore'
import { useLocationStore } from '../store/locationStore'
import { haversineDistance } from '@chatspaces/shared'

export function useD2c(): string | null {
  const d2cTarget = useUIStore((s) => s.d2cTarget)
  const lat = useLocationStore((s) => s.lat)
  const lng = useLocationStore((s) => s.lng)

  return useMemo(() => {
    if (lat == null || lng == null || !d2cTarget) return null
    const meters = haversineDistance({ lat, lng }, { lat: d2cTarget.lat, lng: d2cTarget.lng })
    return formatD2c(meters)
  }, [lat, lng, d2cTarget])
}

function formatD2c(meters: number): string {
  const mins = Math.round(meters / 80)
  if (mins < 1) return '< 1 min'
  if (mins <= 25) return `${mins} min`
  return `${(meters / 1000).toFixed(1)} km`
}
