import { useNavigate } from 'react-router'
import { ArrowLeft, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DMPage() {
  const navigate = useNavigate()

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
        <span style={{ flex: 1, fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}>direct messages</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.3)' }}>
          💎 PRO
        </span>
      </div>

      {/* Locked state */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={28} style={{ color: 'var(--color-warning)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
            premium feature
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 280 }}>
            connect privately with people from your threads. upgrade to unlock direct messages.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 }}>
          {['private conversations', 'no message limits', 'read receipts', 'up to 5 connections'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <span style={{ color: 'var(--color-warning)' }}>✓</span> {f}
            </div>
          ))}
        </div>
        <button
          style={{ width: '100%', maxWidth: 280, padding: '14px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,158,11,0.3)' }}
        >
          upgrade — ₹99/mo
        </button>
      </div>
    </motion.div>
  )
}
