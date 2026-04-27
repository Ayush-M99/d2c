import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import type { Message, Thread } from '@chatspaces/shared'
import { getSocket } from '../lib/socket'
import { api } from '../lib/api'
import { useThreadStore } from '../store/threadStore'
import { useMessageStore } from '../store/messageStore'
import { useSessionStore } from '../store/sessionStore'
import { useUIStore } from '../store/uiStore'
import { MessageBubble } from '../components/chat/MessageBubble'
import { TypingIndicator } from '../components/chat/TypingIndicator'
import { Composer } from '../components/chat/Composer'
import { D2cChip } from '../components/common/D2cChip'
import { useD2c } from '../hooks/useD2c'
import { motion } from 'framer-motion'
import { D2C_THREADS, ZONE_COLORS } from '../lib/mapData'

// Stable empty references — must live outside the component so selectors
// never return a new array literal on every render (causes infinite re-render loop)
const EMPTY_MESSAGES: Message[] = []
const EMPTY_NAMES: string[] = []

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [apiThread, setApiThread] = useState<Thread | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const storeThread = useThreadStore((s) => s.getThread(id ?? ''))
  // Fall back to mock data when backend is not connected
  const mockThread = D2C_THREADS.find((t) => String(t.id) === id)
  // Prefer store thread, then API-loaded thread, then mock
  const thread = storeThread ?? apiThread ?? mockThread

  // Selectors return undefined (not []) when key missing → no infinite loop
  const messages = useMessageStore((s) => s.byThread[id ?? '']) ?? EMPTY_MESSAGES
  const typingNames = useMessageStore((s) => s.typingUsers[id ?? '']) ?? EMPTY_NAMES
  const isJoined = useThreadStore((s) => (id ? !!s.joinedThreadIds[id] : false))
  const setThreadJoined = useThreadStore((s) => s.setThreadJoined)
  const sessionId = useSessionStore((s) => s.sessionId)
  const d2c = useD2c()
  const d2cTarget = useUIStore((s) => s.d2cTarget)
  const setD2cTarget = useUIStore((s) => s.setD2cTarget)
  const darkMode = useUIStore((s) => s.darkMode)

  // Unified thread display info (store > API > mock)
  const isBackendThread = thread && 'threadId' in thread
  const threadTitle = thread?.title ?? 'thread'
  const threadActive = isBackendThread ? (thread as Thread).activeUsers : (thread as any)?.active ?? 0
  const threadEmoji = (thread as any)?.emoji ?? '💬'
  const threadZone = (thread as any)?.zone
  const threadZoneColor = threadZone && threadZone in ZONE_COLORS ? ZONE_COLORS[threadZone as keyof typeof ZONE_COLORS] : 'var(--d2c-violet)'

  // Load thread from API if not in store
  useEffect(() => {
    if (!id || storeThread || mockThread || apiThread || isLoading) return
    setIsLoading(true)
    api
      .getThread(id)
      .then((res) => {
        if (res.thread) {
          setApiThread(res.thread)
          useThreadStore.getState().upsertThread(res.thread)
        }
      })
      .catch(() => {
        // thread not found or network error
      })
      .finally(() => setIsLoading(false))
  }, [id, storeThread, mockThread, apiThread, isLoading])

  // Join thread on mount + re-join on socket reconnect
  useEffect(() => {
    if (!id) return

    const doJoin = () => {
      setThreadJoined(id, false)
      getSocket()?.emit('join_thread', { threadId: id })
    }
    const doDisconnect = () => setThreadJoined(id, false)

    doJoin()

    const socket = getSocket()
    socket?.on('connect', doJoin)
    socket?.on('disconnect', doDisconnect)

    return () => {
      socket?.off('connect', doJoin)
      socket?.off('disconnect', doDisconnect)
      getSocket()?.emit('leave_thread', { threadId: id })
      setThreadJoined(id, false)
      setD2cTarget(null)
    }
  }, [id, setD2cTarget, setThreadJoined])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const bg = darkMode ? 'var(--d2c-bg)' : '#F5F5F8'
  const headerBg = darkMode ? 'rgba(10,10,18,0.92)' : 'rgba(255,255,255,0.92)'
  const borderColor = darkMode ? 'var(--d2c-border)' : 'rgba(0,0,0,0.06)'
  const textPrimary = darkMode ? 'var(--d2c-text)' : '#111'
  const textMuted = darkMode ? 'var(--d2c-text-3)' : '#999'

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25 }}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: bg,
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          height: 58,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 10,
          background: headerBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${borderColor}`,
          zIndex: 10,
        }}
      >
        <button
          aria-label="back"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: textMuted,
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>

        {/* Zone color accent dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: threadZoneColor,
            boxShadow: `0 0 8px ${threadZoneColor}`,
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.02em',
            }}
          >
            {threadEmoji} {threadTitle}
          </p>
          <p
            style={{
              fontSize: 11,
              color: textMuted,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {threadActive} active
          </p>
        </div>

        {d2cTarget && d2c && <D2cChip value={d2c} />}

        <button
          aria-label="options"
          style={{
            background: 'none',
            border: 'none',
            color: textMuted,
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            fontFamily: 'inherit',
          }}
        >
          <MoreHorizontal size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        className="d2c-no-scrollbar"
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              color: textMuted,
              paddingTop: 80,
            }}
          >
            <span style={{ fontSize: 40 }}>{threadEmoji}</span>
            <p style={{ fontSize: 14, fontStyle: 'italic' }}>
              {mockThread ? `"${mockThread.lastMessage}"` : 'be the first to say something'}
            </p>
            <p style={{ fontSize: 12, opacity: 0.6 }}>join the conversation</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.messageId}
            msg={msg}
            isOwn={msg.senderSession === sessionId}
          />
        ))}
        <TypingIndicator names={typingNames} />
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <Composer threadId={id ?? ''} disabled={!isJoined} />
    </motion.div>
  )
}
