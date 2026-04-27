import { useNavigate } from 'react-router'
import { ArrowLeft, Palette, Tag, Users, Lock, Info, LogOut, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSessionStore } from '../store/sessionStore'
import { useUIStore } from '../store/uiStore'

export default function VenuesPage() {
  const navigate = useNavigate()
  const { displayNamesUsed, pairedFriends, clearSession } = useSessionStore()
  const sessionId = useSessionStore((s) => s.sessionId)

  const rows = [
    { icon: <Palette size={18} strokeWidth={1.5} />, label: 'theme', value: 'auto' },
    { icon: <Tag size={18} strokeWidth={1.5} />, label: 'interests', value: 'edit' },
    { icon: <Users size={18} strokeWidth={1.5} />, label: 'paired friends', value: `${pairedFriends.length} / 5`, action: () => navigate('/pair') },
    { icon: <Lock size={18} strokeWidth={1.5} />, label: 'privacy', value: '' },
    { icon: <Info size={18} strokeWidth={1.5} />, label: 'about', value: 'v0.1.0' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', overflowY: 'auto' }}
    >
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}>profile</span>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Avatar + session */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff',
          }}>
            {sessionId ? sessionId.slice(0, 1).toUpperCase() : '?'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>anonymous</p>
            <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-text-muted)', marginTop: 2 }}>
              {sessionId ? `${sessionId.slice(0, 8)}…` : 'loading…'}
            </p>
          </div>
        </div>

        {/* Names used */}
        {displayNamesUsed.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>names you've used</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {displayNamesUsed.slice(-5).map((entry, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-card)' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{entry.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>#{entry.threadTitle.slice(0, 20)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((row) => (
            <button
              key={row.label}
              onClick={row.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                borderRadius: 'var(--radius-md)', background: 'var(--color-surface-card)',
                border: 'none', cursor: row.action ? 'pointer' : 'default', width: '100%', textAlign: 'left',
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>{row.icon}</span>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text-primary)' }}>{row.label}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{row.value}</span>
              {row.action && <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />}
            </button>
          ))}
        </div>

        {/* Premium upsell */}
        <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-warning)', marginBottom: 6 }}>💎 go premium</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>unlock DMs, longer sessions, and more</p>
          <button style={{ padding: '10px 20px', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            upgrade — ₹99/mo
          </button>
        </div>

        {/* Reset session */}
        <button
          onClick={() => { clearSession(); localStorage.removeItem('cs_session_id'); navigate('/') }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', width: '100%' }}>
          <LogOut size={16} style={{ color: 'var(--color-danger)' }} />
          <span style={{ fontSize: 14, color: 'var(--color-danger)' }}>reset session</span>
        </button>
      </div>
    </motion.div>
  )
}
