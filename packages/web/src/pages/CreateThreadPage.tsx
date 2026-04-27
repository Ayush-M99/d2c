import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, MessageSquare, BarChart2, HelpCircle, Timer } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { ensureManipalGeospace } from '../lib/liveLocation'
import { getSocket } from '../lib/socket'
import { useThreadStore } from '../store/threadStore'
import { useUIStore } from '../store/uiStore'

type ThreadType = 'text' | 'poll' | 'qna' | 'countdown'

const TYPE_OPTIONS = [
  { id: 'text' as ThreadType, label: 'Text', icon: <MessageSquare size={18} strokeWidth={1.5} /> },
  { id: 'poll' as ThreadType, label: 'Poll', icon: <BarChart2 size={18} strokeWidth={1.5} /> },
  { id: 'qna' as ThreadType, label: 'Q&A', icon: <HelpCircle size={18} strokeWidth={1.5} /> },
  { id: 'countdown' as ThreadType, label: 'Timer', icon: <Timer size={18} strokeWidth={1.5} /> },
]

export default function CreateThreadPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ThreadType>('text')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const similarThreads = useThreadStore((s) => s.similarThreads)
  const pushToast = useUIStore((s) => s.pushToast)

  useEffect(() => { titleRef.current?.focus() }, [])

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t])
      setTagInput('')
    }
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)' }}
    >
      {/* Header */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}>new thread</span>
        <button onClick={handleCreate} disabled={!canCreate}
          style={{ padding: '7px 18px', borderRadius: 'var(--radius-full)', background: canCreate ? 'var(--color-primary)' : 'var(--color-surface-overlay)', border: 'none', color: canCreate ? '#fff' : 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: canCreate ? 'pointer' : 'not-allowed' }}>
          {isCreating ? 'posting...' : 'post'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Title */}
        <div>
          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            placeholder="what's happening nearby?"
            onKeyDown={(e) => e.key === 'Enter' && canCreate && handleCreate()}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)', caretColor: 'var(--color-primary)' }} />
          <div style={{ textAlign: 'right', fontSize: 11, color: title.length > 100 ? 'var(--color-warning)' : 'var(--color-text-muted)', fontFamily: "'JetBrains Mono', monospace", marginTop: 6 }}>
            {title.length}/120
          </div>
        </div>

        {/* Type */}
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>what kind?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {TYPE_OPTIONS.map((opt) => (
              <button key={opt.id} onClick={() => setType(opt.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 4px', borderRadius: 'var(--radius-md)', border: type === opt.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', background: type === opt.id ? 'rgba(99,102,241,0.1)' : 'transparent', color: type === opt.id ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: 11, cursor: 'pointer' }}>
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>tags (up to 5)</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {tags.map((tag) => (
              <span key={tag} onClick={() => setTags(tags.filter((t) => t !== tag))}
                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: 'var(--color-primary)', cursor: 'pointer' }}>
                #{tag} ×
              </span>
            ))}
          </div>
          {tags.length < 5 && (
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
              placeholder="add tag, press enter"
              style={{ width: '100%', background: 'var(--color-surface-overlay)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none' }} />
          )}
        </div>

        {/* Similar threads */}
        {similarThreads.length > 0 && (
          <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <p style={{ fontSize: 12, color: 'var(--color-warning)', marginBottom: 8 }}>similar threads nearby:</p>
            {similarThreads.slice(0, 3).map((t) => (
              <div key={t.threadId} style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                {t.title}
              </div>
            ))}
            <button onClick={handleCreate} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              create anyway
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
