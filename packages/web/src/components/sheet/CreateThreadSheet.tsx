import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, BarChart2, HelpCircle, Timer } from 'lucide-react'
import { api } from '../../lib/api'
import { ensureManipalGeospace } from '../../lib/liveLocation'
import { getSocket } from '../../lib/socket'
import { useThreadStore } from '../../store/threadStore'
import { useUIStore } from '../../store/uiStore'

type ThreadType = 'text' | 'poll' | 'qna' | 'countdown'

const TYPE_OPTIONS: { id: ThreadType; label: string; icon: React.ReactNode }[] = [
  { id: 'text', label: 'Text', icon: <MessageSquare size={16} strokeWidth={1.5} /> },
  { id: 'poll', label: 'Poll', icon: <BarChart2 size={16} strokeWidth={1.5} /> },
  { id: 'qna', label: 'Q&A', icon: <HelpCircle size={16} strokeWidth={1.5} /> },
  { id: 'countdown', label: 'Timer', icon: <Timer size={16} strokeWidth={1.5} /> },
]

interface Props {
  onClose: () => void
}

export function CreateThreadSheet({ onClose }: Props) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ThreadType>('text')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const similarThreads = useThreadStore((s) => s.similarThreads)
  const pushToast = useUIStore((s) => s.pushToast)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  async function handleCreate() {
    if (!title.trim() || isCreating) return

    setIsCreating(true)
    const liveGeospaceId = await ensureManipalGeospace()
    if (!liveGeospaceId) {
      setIsCreating(false)
      const connected = getSocket()?.connected
      pushToast('error', connected ? 'joining space… try again in a moment' : 'not connected to server')
      return
    }

    try {
      const { thread } = await api.createThread({
        geospaceId: liveGeospaceId,
        title: title.trim(),
        threadType: type,
        tags,
      })
      useThreadStore.getState().upsertThread(thread)
      onClose()
      navigate(`/thread/${thread.threadId}`)
    } catch (err: any) {
      if (err?.body?.suggestedThreads) {
        useThreadStore.getState().setSimilarThreads(err.body.suggestedThreads)
      }
      pushToast('error', err?.message ?? 'could not create thread')
    } finally {
      setIsCreating(false)
    }
  }

  const canCreate = title.trim().length > 0 && !isCreating

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 5000,
          display: 'flex',
          alignItems: 'flex-end',
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{
            width: '100%',
            background: 'var(--color-surface-elevated)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: '0 0 32px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span
              style={{ flex: 1, fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}
            >
              new thread
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Title */}
            <div>
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="what's happening nearby?"
                onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreate()}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 18,
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  caretColor: 'var(--color-primary)',
                }}
              />
              <div
                style={{
                  textAlign: 'right',
                  fontSize: 11,
                  color: title.length > 100 ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: 4,
                }}
              >
                {title.length}/120
              </div>
            </div>

            {/* Type selector */}
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                what kind?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setType(opt.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-md)',
                      border:
                        type === opt.id
                          ? '1px solid var(--color-primary)'
                          : '1px solid var(--color-border)',
                      background: type === opt.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                      color: type === opt.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                tags
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => removeTag(tag)}
                    style={{
                      fontSize: 12,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(99,102,241,0.12)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    #{tag} ×
                  </span>
                ))}
              </div>
              {tags.length < 5 && (
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="add tag, press enter"
                  style={{
                    width: '100%',
                    background: 'var(--color-surface-overlay)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              )}
            </div>

            {/* Similar threads warning */}
            {similarThreads.length > 0 && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}
              >
                <p style={{ fontSize: 12, color: 'var(--color-warning)', marginBottom: 8 }}>
                  similar threads exist:
                </p>
                {similarThreads.slice(0, 2).map((t) => (
                  <div
                    key={t.threadId}
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            )}

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: canCreate ? 'var(--color-primary)' : 'var(--color-surface-overlay)',
                border: 'none',
                color: canCreate ? '#fff' : 'var(--color-text-muted)',
                fontSize: 15,
                fontWeight: 600,
                cursor: canCreate ? 'pointer' : 'not-allowed',
                transition: 'background 200ms ease',
              }}
            >
              {isCreating ? 'creating...' : 'create thread'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
