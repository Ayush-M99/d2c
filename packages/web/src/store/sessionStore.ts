import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DisplayNameEntry {
  name: string
  threadId: string
  threadTitle: string
}

interface SessionState {
  sessionId: string | null
  isPremium: boolean
  pairedFriends: string[]
  displayNamesUsed: DisplayNameEntry[]

  setSessionId: (id: string) => void
  setPremium: (v: boolean) => void
  addPairedFriend: (id: string) => void
  addDisplayName: (entry: DisplayNameEntry) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      isPremium: false,
      pairedFriends: [],
      displayNamesUsed: [],

      setSessionId: (id) => set({ sessionId: id }),
      setPremium: (isPremium) => set({ isPremium }),
      addPairedFriend: (id) =>
        set((s) => ({ pairedFriends: [...new Set([...s.pairedFriends, id])] })),
      addDisplayName: (entry) =>
        set((s) => ({ displayNamesUsed: [...s.displayNamesUsed, entry] })),
      clearSession: () =>
        set({ sessionId: null, isPremium: false, pairedFriends: [], displayNamesUsed: [] }),
    }),
    { name: 'cs-session', partialize: (s) => ({ sessionId: s.sessionId, isPremium: s.isPremium, pairedFriends: s.pairedFriends }) },
  ),
)
