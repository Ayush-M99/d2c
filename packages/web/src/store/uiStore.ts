import { create } from 'zustand'

export type SheetSnap = 0 | 1 | 2
export type ActiveTab = 'nearby' | 'hot' | 'for-you' | 'search'

export interface Toast {
  id: string
  variant: 'info' | 'success' | 'warn' | 'error'
  message: string
}

interface D2cTarget {
  lat: number
  lng: number
  threadId: string
}

interface UIState {
  sheetSnap: SheetSnap
  activeTab: ActiveTab
  d2cTarget: D2cTarget | null
  showCreateThread: boolean
  graceSeconds: number | null
  toasts: Toast[]
  darkMode: boolean

  setSheetSnap: (s: SheetSnap) => void
  setActiveTab: (t: ActiveTab) => void
  setD2cTarget: (t: D2cTarget | null) => void
  setShowCreateThread: (v: boolean) => void
  setGraceSeconds: (s: number | null) => void
  pushToast: (variant: Toast['variant'], message: string) => void
  dismissToast: (id: string) => void
  toggleDarkMode: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  sheetSnap: 1,
  activeTab: 'hot',
  d2cTarget: null,
  showCreateThread: false,
  graceSeconds: null,
  toasts: [],
  darkMode: true,

  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setD2cTarget: (d2cTarget) => set({ d2cTarget }),
  setShowCreateThread: (showCreateThread) => set({ showCreateThread }),
  setGraceSeconds: (graceSeconds) => set({ graceSeconds }),
  pushToast: (variant, message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), variant, message }],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode
      document.documentElement.classList.toggle('light', !next)
      return { darkMode: next }
    }),
}))
