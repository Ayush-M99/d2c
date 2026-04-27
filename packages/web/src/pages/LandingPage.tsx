import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import { gsap } from 'gsap'
import { shouldEnable3D } from '../lib/gpu-detect'
import { detectGpuCapability } from '../lib/gpu-detect'

const ParticleField = lazy(() =>
  import('../components/landing/ParticleField').then((m) => ({ default: m.ParticleField })),
)

const SLIDES = [
  {
    headline: 'find your block.',
    sub: "see who's chatting nearby — right now.",
    cta: null,
  },
  {
    headline: 'no name. no history.',
    sub: 'anonymous by design. every session, a new you.',
    cta: null,
  },
  {
    headline: 'tap. talk. go.',
    sub: 'drop into a thread, say your piece, vanish.',
    cta: 'enable location',
  },
]

function HeadlineText({ text, play }: { text: string; play: boolean }) {
  const words = text.split(' ')
  const refs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (!play) return
    gsap.fromTo(
      refs.current.filter(Boolean),
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.55, ease: 'power3.out', delay: 0.1 },
    )
  }, [play])

  return (
    <span>
      {words.map((word, i) => (
        <span
          key={i}
          ref={(el) => { refs.current[i] = el }}
          style={{ display: 'inline-block', marginRight: '0.25em', opacity: 0 }}
        >
          {word}
        </span>
      ))}
    </span>
  )
}

export default function LandingPage() {
  const [slide, setSlide] = useState(0)
  const [show3d, setShow3d] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    detectGpuCapability().then((cap) => setShow3d(shouldEnable3D(cap)))
  }, [])

  function next() {
    if (slide < SLIDES.length - 1) setSlide((s) => s + 1)
  }

  async function handleEnable() {
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(() => resolve(), reject, { timeout: 8000 })
      })
    } catch {
      // user denied — still proceed to explore (peek mode)
    }
    navigate('/explore')
  }

  const current = SLIDES[slide]

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
      }}
    >
      {/* Particle background */}
      {show3d && (
        <Suspense fallback={null}>
          <ParticleField count={400} />
        </Suspense>
      )}

      {/* Skip */}
      <button
        onClick={() => navigate('/explore')}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          fontSize: 13,
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        skip
      </button>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          style={{
            textAlign: 'center',
            maxWidth: 380,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(32px, 8vw, 48px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
              lineHeight: 1.1,
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            <HeadlineText text={current.headline} play={true} />
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            style={{
              fontSize: 16,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: 40,
            }}
          >
            {current.sub}
          </motion.p>

          {current.cta ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            >
              <button
                onClick={handleEnable}
                style={{
                  padding: '14px 40px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-glow)',
                  transition: 'transform 150ms ease',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.transform = 'scale(1.03)')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = 'scale(1)')}
              >
                {current.cta}
              </button>
              <button
                onClick={() => navigate('/explore')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                peek without location
              </button>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={next}
              style={{
                padding: '12px 32px',
                borderRadius: 'var(--radius-full)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              next →
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Pagination dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          display: 'flex',
          gap: 8,
          zIndex: 10,
        }}
      >
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setSlide(i)}
            style={{
              width: i === slide ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === slide ? 'var(--color-primary)' : 'var(--color-border)',
              cursor: 'pointer',
              transition: 'all 300ms ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}
