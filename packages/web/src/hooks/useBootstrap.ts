import { useEffect } from 'react'
import { generateFingerprint } from '../lib/fingerprint'
import { api, setSessionId } from '../lib/api'
import { connectSocket } from '../lib/socket'
import { useSessionStore } from '../store/sessionStore'
import { useUIStore } from '../store/uiStore'

const LS_SESSION = 'cs_session_id'
const MAX_RETRIES = 5

export function useBootstrap() {
  const setStoreSessionId = useSessionStore((s) => s.setSessionId)
  const pushToast = useUIStore((s) => s.pushToast)

  useEffect(() => {
    let cancelled = false

    async function init(attempt = 0) {
      try {
        const existing = localStorage.getItem(LS_SESSION)
        if (existing) {
          setSessionId(existing)
          try {
            await api.getSession(existing)
            if (cancelled) return
            setStoreSessionId(existing)
            connectSocket(existing)
            return
          } catch {
            localStorage.removeItem(LS_SESSION)
          }
        }

        const fingerprint = await generateFingerprint()
        const { session } = await api.createSession(fingerprint)
        if (cancelled) return
        localStorage.setItem(LS_SESSION, session.sessionId)
        setSessionId(session.sessionId)
        setStoreSessionId(session.sessionId)
        connectSocket(session.sessionId)
      } catch (err) {
        if (cancelled) return
        console.error('[bootstrap] attempt', attempt, err)
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(1000 * 2 ** attempt, 16000)
          pushToast('warn', `connecting… retrying in ${Math.round(delay / 1000)}s`)
          setTimeout(() => { if (!cancelled) init(attempt + 1) }, delay)
        } else {
          pushToast('error', 'could not connect to server — please reload')
        }
      }
    }

    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
