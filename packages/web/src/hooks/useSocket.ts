import { useEffect } from 'react'
import { getSocket } from '../lib/socket'
import { useSessionStore } from '../store/sessionStore'
import { useLocationStore } from '../store/locationStore'
import { useThreadStore } from '../store/threadStore'
import { useMessageStore } from '../store/messageStore'
import { useUIStore } from '../store/uiStore'

export function useSocket() {
  const sessionId = useSessionStore((s) => s.sessionId)

  useEffect(() => {
    if (!sessionId) return

    const socket = getSocket()
    if (!socket) return

    const onGeospaceUpdate = (data: any) => {
      const { lat, lng } = useLocationStore.getState()
      useLocationStore.getState().setGeospaceId(data.geospaceId)
      useLocationStore.getState().setVenueId(data.venueId ?? null)
      if (lat != null && lng != null) {
        useLocationStore.getState().setGeospaceCenter(lat, lng)
      }
      useThreadStore.getState().setHot(data.threads ?? [])
      useThreadStore.getState().setNearby(data.threads ?? [])
    }

    const onThreadList = (data: any) => {
      useThreadStore.getState().setHot(data.hot ?? [])
      useThreadStore.getState().setForYou(data.forYou ?? [])
      useThreadStore.getState().setNearby(data.nearby ?? data.hot ?? [])
    }

    const onThreadCreated = (data: any) => {
      if (data?.thread) useThreadStore.getState().upsertThread(data.thread)
    }

    const onThreadJoined = (data: any) => {
      if (data?.threadId) useThreadStore.getState().setThreadJoined(data.threadId, true)
    }

    const onNewMessage = (msg: any) => {
      useMessageStore.getState().addMessage(msg)
    }

    const onMissedMessages = (data: any) => {
      useMessageStore.getState().prependMessages(data.threadId, data.messages ?? [])
    }

    const onSimilarThreads = (data: any) => {
      useThreadStore.getState().setSimilarThreads(data.suggestedThreads ?? [])
    }

    const onExitPrompt = (data: any) => {
      useUIStore.getState().setGraceSeconds(data.graceSeconds)
    }

    const onReadOnlyEntered = () => {
      useLocationStore.getState().setReadOnly(true)
      useUIStore.getState().pushToast('warn', 'too far — read-only mode')
    }

    const onTypingUsers = (data: any) => {
      if (data?.threadId) {
        useMessageStore.getState().setTyping(data.threadId, data.names ?? [])
      }
    }

    const onFriendPaired = () => {
      useUIStore.getState().pushToast('success', 'friend added!')
    }

    const onError = (data: any) => {
      if (data?.code === 'JOIN_FAILED' && data?.threadId) {
        useThreadStore.getState().setThreadJoined(data.threadId, false)
      }
      useUIStore.getState().pushToast('error', data?.message ?? 'unknown error')
    }

    socket.on('geospace_update', onGeospaceUpdate)
    socket.on('thread_list', onThreadList)
    socket.on('thread_created', onThreadCreated)
    socket.on('thread_joined', onThreadJoined)
    socket.on('new_message', onNewMessage)
    socket.on('missed_messages', onMissedMessages)
    socket.on('similar_threads', onSimilarThreads)
    socket.on('typing_users', onTypingUsers)
    socket.on('exit_prompt', onExitPrompt)
    socket.on('read_only_entered', onReadOnlyEntered)
    socket.on('friend_paired', onFriendPaired)
    socket.on('error', onError)

    return () => {
      socket.off('geospace_update', onGeospaceUpdate)
      socket.off('thread_list', onThreadList)
      socket.off('thread_created', onThreadCreated)
      socket.off('thread_joined', onThreadJoined)
      socket.off('new_message', onNewMessage)
      socket.off('missed_messages', onMissedMessages)
      socket.off('similar_threads', onSimilarThreads)
      socket.off('typing_users', onTypingUsers)
      socket.off('exit_prompt', onExitPrompt)
      socket.off('read_only_entered', onReadOnlyEntered)
      socket.off('friend_paired', onFriendPaired)
      socket.off('error', onError)
    }
  }, [sessionId])
}
