import type { Message } from '@chatspaces/shared'
import { ViewOnceImage } from './ViewOnceImage'
import { useSessionStore } from '../../store/sessionStore'

interface Props {
  msg: Message
  isOwn: boolean
}

function hashColor(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  const colors = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6']
  return colors[Math.abs(h) % colors.length]
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ msg, isOwn }: Props) {
  if (msg.type === 'system') {
    return (
      <div
        className="animate-slide-up"
        style={{
          textAlign: 'center',
          padding: '4px 0',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          fontStyle: 'italic',
        }}
      >
        {msg.content}
      </div>
    )
  }

  return (
    <div
      className="animate-slide-up"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        gap: 3,
        padding: '2px 0',
      }}
    >
      {/* Display name */}
      {!isOwn && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: hashColor(msg.senderDisplayName),
            paddingLeft: 12,
          }}
        >
          {msg.senderDisplayName}
        </span>
      )}

      {/* Reply preview */}
      {msg.replyPreview && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
            borderLeft: '2px solid var(--color-border)',
            paddingLeft: 8,
            marginLeft: isOwn ? 0 : 12,
            marginRight: isOwn ? 12 : 0,
            maxWidth: '75%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {msg.replyPreview}
        </div>
      )}

      {/* Bubble */}
      {msg.type === 'image' ? (
        <ViewOnceImage mediaId={msg.messageId} isOwn={isOwn} />
      ) : (
        <div
          style={{
            maxWidth: '75%',
            padding: '10px 14px',
            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isOwn ? 'rgba(99,102,241,0.2)' : 'var(--color-surface-overlay)',
            border: isOwn
              ? '1px solid rgba(99,102,241,0.25)'
              : '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: 14,
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {msg.content}
        </div>
      )}

      {/* Timestamp */}
      <span
        style={{
          fontSize: 10,
          color: 'var(--color-text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
          paddingLeft: isOwn ? 0 : 12,
          paddingRight: isOwn ? 12 : 0,
        }}
      >
        {formatTime(msg.timestamp)}
      </span>
    </div>
  )
}
