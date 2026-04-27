import { create } from 'zustand'
import type { Message } from '@chatspaces/shared'

interface MessageState {
  byThread: Record<string, Message[]>
  typingUsers: Record<string, string[]>

  addMessage: (msg: Message) => void
  prependMessages: (threadId: string, msgs: Message[]) => void
  clearThread: (threadId: string) => void
  setTyping: (threadId: string, names: string[]) => void
}

export const useMessageStore = create<MessageState>()((set) => ({
  byThread: {},
  typingUsers: {},

  addMessage: (msg) =>
    set((s) => ({
      byThread: {
        ...s.byThread,
        [msg.threadId]: [...(s.byThread[msg.threadId] ?? []), msg],
      },
    })),

  prependMessages: (threadId, msgs) =>
    set((s) => ({
      byThread: {
        ...s.byThread,
        [threadId]: [...msgs, ...(s.byThread[threadId] ?? [])],
      },
    })),

  clearThread: (threadId) =>
    set((s) => ({ byThread: { ...s.byThread, [threadId]: [] } })),

  setTyping: (threadId, names) =>
    set((s) => ({ typingUsers: { ...s.typingUsers, [threadId]: names } })),
}))
