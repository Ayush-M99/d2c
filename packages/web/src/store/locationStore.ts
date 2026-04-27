import { create } from 'zustand'

interface LocationState {
  lat: number | null
  lng: number | null
  accuracy: number
  geospaceId: string | null
  geospaceCenter: { lat: number; lng: number } | null
  venueId: string | null
  isReadOnly: boolean
  permissionState: PermissionState | 'unknown'

  setLocation: (lat: number, lng: number, accuracy: number) => void
  setGeospaceId: (id: string) => void
  setGeospaceCenter: (lat: number, lng: number) => void
  setVenueId: (id: string | null) => void
  setReadOnly: (v: boolean) => void
  setPermissionState: (s: PermissionState | 'unknown') => void
}

export const useLocationStore = create<LocationState>()((set) => ({
  lat: null,
  lng: null,
  accuracy: 0,
  geospaceId: null,
  geospaceCenter: null,
  venueId: null,
  isReadOnly: false,
  permissionState: 'unknown',

  setLocation: (lat, lng, accuracy) => set({ lat, lng, accuracy }),
  setGeospaceId: (geospaceId) => set({ geospaceId }),
  setGeospaceCenter: (lat, lng) => set({ geospaceCenter: { lat, lng } }),
  setVenueId: (venueId) => set({ venueId }),
  setReadOnly: (isReadOnly) => set({ isReadOnly }),
  setPermissionState: (permissionState) => set({ permissionState }),
}))
