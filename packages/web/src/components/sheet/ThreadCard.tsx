import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Thread } from '@chatspaces/shared'
import { useUIStore } from '../../store/uiStore'
import { Pill } from '../common/Pill'
import { AvatarStack } from '../common/Avatar'
import { ZONE_COLORS, type D2cThread } from '../../lib/mapData'

const TYPE_EMOJI: Record<string, string> = {
  text: '💬', poll: '📊', qna: '❓', countdown: '⏱',
}

function formatAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

interface Props {
  thread: D2cThread | Thread
  index?: number
  mode?: 'backend' | 'demo'
}

function isBackendThread(thread: D2cThread | Thread): thread is Thread {
  return 'threadId' in thread
}

export function ThreadCard({ thread, index = 0, mode }: Props) {
  const [hov, setHov] = useState(false)
  const navigate = useNavigate()
  const setD2cTarget = useUIStore((s) => s.setD2cTarget)
  const pushToast = useUIStore((s) => s.pushToast)
  const darkMode = useUIStore((s) => s.darkMode)

  const backend = isBackendThread(thread)
  const isDemo = mode === 'demo' || !backend
  const zoneColor = backend ? 'var(--color-primary)' : ZONE_COLORS[thread.zone] || '#8B5CF6'
  const title = thread.title
  const tags = thread.tags ?? []
  const active = backend ? thread.activeUsers : thread.active
  const emoji = backend
    ? (TYPE_EMOJI[thread.threadType] ?? '💬')
    : thread.emoji
  const participants = backend
    ? thread.previewMessages.map((m) => m.senderDisplayName).filter(Boolean)
    : thread.participants
  const lastMessage = backend
    ? (thread.previewMessages.at(-1)?.content ?? 'be the first to say something')
    : thread.lastMessage
  const ago = backend
    ? formatAgo(thread.lastActivity)
    : thread.ago
  const isHot = active > 20

  const cardBg = darkMode
    ? hov
      ? 'var(--d2c-surface-2)'
      : 'var(--d2c-surface)'
    : hov
      ? '#F0F0F5'
      : '#fff'
  const cardBorder = darkMode ? 'var(--d2c-border)' : 'rgba(0,0,0,0.06)'
  const textCol = darkMode ? 'var(--d2c-text)' : '#111'
  const text2Col = darkMode ? 'var(--d2c-text-2)' : '#555'
  const text3Col = darkMode ? 'var(--d2c-text-3)' : '#999'

  function handleClick() {
    if (backend) {
      setD2cTarget(null)
      navigate(`/thread/${thread.threadId}`)
      return
    }

    setD2cTarget({ lat: thread.lat, lng: thread.lng, threadId: String(thread.id) })
    pushToast('info', 'demo thread preview only - create a nearby thread to chat live')
  }

  return (
    <div
      onClick={handleClick}
      onPointerEnter={() => setHov(true)}
      onPointerLeave={() => setHov(false)}
      style={{
        background: cardBg,
        border: `1px solid ${hov ? zoneColor + '55' : cardBorder}`,
        borderRadius: 'var(--d2c-r-md)',
        padding: '14px 16px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transform: hov ? 'translateY(-2px) scale(1.005)' : 'none',
        boxShadow: hov ? `0 8px 32px ${zoneColor}15, 0 0 0 1px ${zoneColor}22` : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.22s cubic-bezier(0.34,1.2,0.64,1)',
        animation: 'd2c-fadein 0.35s ease both',
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 3,
          height: '100%',
          background: `linear-gradient(180deg, ${zoneColor}, transparent)`,
          borderRadius: '0 2px 2px 0',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: text3Col }}>{emoji}</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: textCol,
                lineHeight: 1.3,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {title}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {tags.map((t) => (
              <Pill key={t} label={`#${t}`} color={zoneColor} small />
            ))}
            {isDemo && <Pill label="demo" color={zoneColor} small />}
            {isHot && <Pill label="hot" color="var(--d2c-red)" glow small />}
          </div>
          <div
            style={{
              fontSize: 13,
              color: text2Col,
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            "{lastMessage}"
          </div>
        </div>
        <AvatarStack names={participants} size={26} />
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: zoneColor,
              boxShadow: `0 0 8px ${zoneColor}`,
            }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: text3Col }}>
            {active} active
          </span>
        </div>
        <span style={{ fontSize: 10, color: text3Col }}>.</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: text3Col }}>
          {ago}
        </span>
      </div>
    </div>
  )
}
