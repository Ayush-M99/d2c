import { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { Eye } from 'lucide-react'
import { getSocket } from '../../lib/socket'

interface Props {
  mediaId: string
  isOwn: boolean
}

type State = 'locked' | 'revealing' | 'counting' | 'viewed'

export function ViewOnceImage({ mediaId, isOwn }: Props) {
  const [state, setState] = useState<State>('locked')
  const [secondsLeft, setSecondsLeft] = useState(8)
  const overlayRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startReveal() {
    if (state !== 'locked') return
    setState('revealing')

    // GSAP unfold: 4 panels fold open
    const el = overlayRef.current
    if (!el) return

    const panels = el.querySelectorAll<HTMLElement>('.vo-panel')
    gsap.set(panels, { transformOrigin: 'center center', transformStyle: 'preserve-3d' })

    gsap
      .timeline({
        onComplete: () => {
          setState('counting')
          setSecondsLeft(8)
          timerRef.current = setInterval(() => {
            setSecondsLeft((s) => {
              if (s <= 1) {
                clearInterval(timerRef.current!)
                handleDismiss()
                return 0
              }
              return s - 1
            })
          }, 1000)
        },
      })
      .to(panels[0], { rotateX: -90, duration: 0.2, ease: 'power2.in' })
      .to(panels[1], { rotateY: 90, duration: 0.2, ease: 'power2.in' }, '-=0.1')
      .to(panels[2], { rotateX: 90, duration: 0.2, ease: 'power2.in' }, '-=0.1')
      .to(panels[3], { rotateY: -90, duration: 0.2, ease: 'power2.in' }, '-=0.1')
      .to(panels, { opacity: 0, duration: 0.15 })
  }

  function handleDismiss() {
    if (timerRef.current) clearInterval(timerRef.current)
    setState('viewed')
    getSocket()?.emit('view_confirmed', { mediaId })
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const width = 200
  const height = 160

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--color-surface-overlay)',
        border: '1px solid var(--color-border)',
        cursor: state === 'locked' ? 'pointer' : state === 'counting' ? 'pointer' : 'default',
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
      }}
      onClick={() => {
        if (state === 'locked') startReveal()
        if (state === 'counting') handleDismiss()
      }}
    >
      {/* Blurred placeholder image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, var(--color-surface-overlay), var(--color-surface-card))',
          filter: state === 'locked' ? 'blur(12px)' : undefined,
        }}
      />

      {/* Locked state overlay */}
      {state === 'locked' && (
        <div
          ref={overlayRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {/* 4 fold panels */}
          {['vo-panel top', 'vo-panel right', 'vo-panel bottom', 'vo-panel left'].map((cls, i) => (
            <div
              key={i}
              className={cls}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15,15,25,0.7)',
                backdropFilter: 'blur(6px)',
              }}
            />
          ))}
          <Eye size={24} style={{ color: 'var(--color-text-secondary)', position: 'relative', zIndex: 1 }} />
          <span
            style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            tap to view once
          </span>
        </div>
      )}

      {/* Countdown */}
      {state === 'counting' && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: '#fff',
            zIndex: 2,
          }}
        >
          {secondsLeft}
        </div>
      )}

      {/* Viewed state */}
      {state === 'viewed' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'var(--color-surface-overlay)',
          }}
        >
          <Eye size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>viewed</span>
        </div>
      )}
    </div>
  )
}
