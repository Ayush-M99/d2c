import { create } from 'zustand'
import type { Thread } from '@chatspaces/shared'

interface ThreadState {
  hot: Thread[]
  forYou: Thread[]
  nearby: Thread[]
  searchResults: Thread[]
  selectedThreadId: string | null
  joinedThreadIds: Record<string, boolean>
  searchQuery: string
  similarThreads: Thread[]

  setHot: (t: Thread[]) => void
  setForYou: (t: Thread[]) => void
  setNearby: (t: Thread[]) => void
  setSearchResults: (t: Thread[]) => void
  setSelectedThreadId: (id: string | null) => void
  setThreadJoined: (id: string, joined: boolean) => void
  setSearchQuery: (q: string) => void
  setSimilarThreads: (t: Thread[]) => void
  upsertThread: (t: Thread) => void
  getThread: (id: string) => Thread | undefined
}

export const useThreadStore = create<ThreadState>()((set, get) => ({
  hot: [],
  forYou: [],
  nearby: [],
  searchResults: [],
  selectedThreadId: null,
  joinedThreadIds: {},
  searchQuery: '',
  similarThreads: [],

  setHot: (hot) => set({ hot }),
  setForYou: (forYou) => set({ forYou }),
  setNearby: (nearby) => set({ nearby }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSelectedThreadId: (selectedThreadId) => set({ selectedThreadId }),
  setThreadJoined: (id, joined) =>
    set((s) => ({ joinedThreadIds: { ...s.joinedThreadIds, [id]: joined } })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSimilarThreads: (similarThreads) => set({ similarThreads }),
  upsertThread: (thread) =>
    set((s) => {
      const upsert = (threads: Thread[]) =>
        threads.some((t) => t.threadId === thread.threadId)
          ? threads.map((t) => (t.threadId === thread.threadId ? thread : t))
          : [thread, ...threads]

      return {
        hot: upsert(s.hot),
        nearby: upsert(s.nearby),
        forYou: s.forYou.some((t) => t.threadId === thread.threadId)
          ? s.forYou.map((t) => (t.threadId === thread.threadId ? thread : t))
          : s.forYou,
      }
    }),

  getThread: (id) => {
    const { hot, forYou, nearby, searchResults } = get()
    return [...hot, ...forYou, ...nearby, ...searchResults].find((t) => t.threadId === id)
  },
}))
