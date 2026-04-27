import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { api } from '../lib/api'
import { useSessionStore } from '../store/sessionStore'
import { useUIStore } from '../store/uiStore'

type PairTab = 'show' | 'enter'

export default function PairPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<PairTab>('show')
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const checkRef = useRef<SVGSVGElement>(null)
  const sessionId = useSessionStore((s) => s.sessionId)
  const pushToast = useUIStore((s) => s.pushToast)

  useEffect(() => {
    if (!sessionId) return
    api.generatePairCode(sessionId)
      .then(({ code: c, expiresAt: exp }) => { setCode(c); setExpiresAt(exp) })
      .catch(() => pushToast('error', 'could not generate code'))
  }, [sessionId])

  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - Date.now()) / 1000)) : 0

  async function handleCopy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDigitChange(i: number, val: string) {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d && i < 5) inputRefs.current[i + 1]?.focus()
    if (next.every((x) => x) && next.join('').length === 6) submitCode(next.join(''))
  }

  function handleDigitKey(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  async function submitCode(entered: string) {
    if (!sessionId) return
    try {
      await api.usePairCode(sessionId, entered)
      setSubmitState('success')
      if (checkRef.current) {
        gsap.fromTo(checkRef.current, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' })
      }
    } catch {
      setSubmitState('error')
      const shakeTarget = inputRefs.current[0]?.parentElement
      if (shakeTarget) gsap.fromTo(shakeTarget, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)', keyframes: [{ x: -6 }, { x: 6 }, { x: -4 }, { x: 4 }, { x: 0 }] })
      setTimeout(() => { setDigits(['', '', '', '', '', '']); setSubmitState('idle') }, 1000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)' }}
    >
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}>connect with friend</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {(['show', 'enter'] as PairTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '14px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: 14, fontWeight: tab === t ? 600 : 400, cursor: 'pointer' }}>
            {t === 'show' ? 'show code' : 'enter code'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'show' ? (
          <motion.div key="show" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>share this code with your friend</p>
            <div
              style={{ fontSize: 48, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '0.2em', color: 'var(--color-text-primary)', background: 'var(--color-surface-overlay)', padding: '20px 32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              {code ?? '——————'}
            </div>
            {secondsLeft > 0 && (
              <p style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-muted)' }}>
                expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </p>
            )}
            <button onClick={handleCopy} disabled={!code}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 'var(--radius-full)', background: 'var(--color-surface-overlay)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13, cursor: code ? 'pointer' : 'not-allowed' }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'copied!' : 'copy'}
            </button>
          </motion.div>
        ) : (
          <motion.div key="enter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 32 }}>
            {submitState === 'success' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <svg ref={checkRef} width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="28" stroke="var(--color-success)" strokeWidth="3" />
                  <path d="M20 32l10 10 14-18" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="100" strokeDashoffset="100" />
                </svg>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-success)' }}>friend added!</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>enter your friend's code</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {digits.map((d, i) => (
                    <input key={i} ref={(el) => { inputRefs.current[i] = el }} value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKey(i, e)}
                      maxLength={1} inputMode="numeric"
                      style={{ width: 44, height: 56, textAlign: 'center', fontSize: 24, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-overlay)', border: `1px solid ${submitState === 'error' ? 'var(--color-danger)' : d ? 'var(--color-primary)' : 'var(--color-border)'}`, color: 'var(--color-text-primary)', outline: 'none' }} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
