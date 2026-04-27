import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore, type Toast } from '../../store/uiStore'

const VARIANT_COLOR: Record<Toast['variant'], string> = {
  info: 'var(--color-primary)',
  success: 'var(--color-success)',
  warn: 'var(--color-warning)',
  error: 'var(--color-danger)',
}

function ToastItem({ id, variant, message, onDismiss }: Toast & { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [id, onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'var(--color-surface-overlay)',
        border: `1px solid ${VARIANT_COLOR[variant]}44`,
        borderRadius: 'var(--radius-md)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: 'var(--shadow-card)',
        whiteSpace: 'nowrap',
        minWidth: 180,
        cursor: 'pointer',
      }}
      onClick={onDismiss}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: VARIANT_COLOR[variant],
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{message}</span>
    </motion.div>
  )
}

export function ToastStack() {
  const toasts = useUIStore((s) => s.toasts)
  const dismissToast = useUIStore((s) => s.dismissToast)

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem {...t} onDismiss={() => dismissToast(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
