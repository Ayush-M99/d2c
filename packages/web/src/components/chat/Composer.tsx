import { useState, useRef } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { getSocket } from '../../lib/socket'
import { useLocationStore } from '../../store/locationStore'
import { useUIStore } from '../../store/uiStore'

interface Props {
  threadId: string
  disabled?: boolean
}

export function Composer({ threadId, disabled }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isReadOnly = useLocationStore((s) => s.isReadOnly)
  const pushToast = useUIStore((s) => s.pushToast)
  const isDisabled = disabled || isReadOnly

  function adjustHeight() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function handleSend() {
    const content = text.trim()
    if (!content || isDisabled) return

    const socket = getSocket()
    if (!socket?.connected) {
      pushToast('error', 'not connected — try again in a moment')
      return
    }

    const cleanup = () => {
      socket.off('error', handleError)
      socket.off('new_message', handleSuccess)
      clearTimeout(timer)
    }

    const handleError = (data: any) => {
      if (data?.code === 'MESSAGE_REJECTED') {
        cleanup()
        setText(content)
        requestAnimationFrame(adjustHeight)
        pushToast('warn', data?.message ?? 'message not sent')
      }
    }

    const handleSuccess = () => cleanup()

    // Cleanup after 8s regardless — prevents permanent listener leak
    const timer = setTimeout(() => {
      cleanup()
    }, 8000)

    socket.once('error', handleError)
    socket.once('new_message', handleSuccess)
    socket.emit('send_message', {
      threadId,
      content,
      msgType: 'text',
    })
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const hasText = text.trim().length > 0

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        padding: '10px 16px 16px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface-elevated)',
        flexShrink: 0,
      }}
    >
      {/* Attach */}
      <button
        aria-label="attach"
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--color-surface-overlay)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginBottom: 1,
        }}
      >
        <Paperclip size={16} strokeWidth={1.5} />
      </button>

      {/* Input */}
      <div
        style={{
          flex: 1,
          background: 'var(--color-surface-overlay)',
          border: `1px solid ${hasText ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '10px 14px',
          transition: 'border-color 150ms ease',
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            adjustHeight()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={isReadOnly ? 'read-only - moved too far' : disabled ? 'joining thread...' : 'type a message...'}
          disabled={isDisabled}
          rows={1}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 14,
            color: 'var(--color-text-primary)',
            lineHeight: 1.5,
            caretColor: 'var(--color-primary)',
            overflow: 'hidden',
          }}
        />
      </div>

      {/* Send */}
      <button
        aria-label="send"
        onClick={handleSend}
        disabled={!hasText || isDisabled}
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: hasText && !isDisabled ? 'var(--color-primary)' : 'var(--color-surface-overlay)',
          border: hasText && !isDisabled ? 'none' : '1px solid var(--color-border)',
          color: hasText && !isDisabled ? '#fff' : 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: hasText && !isDisabled ? 'pointer' : 'default',
          transition: 'background 200ms ease, color 200ms ease',
          marginBottom: 1,
          boxShadow: hasText && !isDisabled ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
        }}
      >
        <Send size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
