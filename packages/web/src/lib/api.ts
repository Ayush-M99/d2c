import { API_BASE } from './constants'

let sessionId: string | null = null

export function setSessionId(id: string) {
  sessionId = id
}

export function getSessionId() {
  return sessionId
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }
  if (sessionId) headers['X-Session-Id'] = sessionId

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status, body })
  }
  return res.json()
}

export const api = {
  // Sessions
  createSession: (fingerprint: string, interestTags?: string[]) =>
    request<{ session: any }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ fingerprint, interestTags }),
    }),

  getSession: (id: string) =>
    request<{ session: any }>(`/sessions/${id}`),

  heartbeat: (id: string) =>
    request<{ ok: true }>(`/sessions/${id}/heartbeat`, { method: 'POST' }),

  updateTags: (id: string, tags: string[]) =>
    request<{ ok: true }>(`/sessions/${id}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags }),
    }),

  generatePairCode: (id: string) =>
    request<{ code: string; expiresAt: number }>(`/sessions/${id}/pair-code`, { method: 'POST' }),

  usePairCode: (id: string, code: string) =>
    request<{ friendSessionId: string }>(`/sessions/${id}/pair`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // GeoSpace
  getGeospace: (lat: number, lng: number, tier = 'nearby') =>
    request<{ geospace: any; threads: any[] }>(`/geospace?lat=${lat}&lng=${lng}&tier=${tier}`),

  peek: (lat: number, lng: number) =>
    request<{ data: any }>(`/geospace/peek?lat=${lat}&lng=${lng}`),

  // Threads
  getThreads: (geospaceId: string, tags?: string) =>
    request<{ hot: any[]; forYou: any[] }>(`/threads?geospaceId=${geospaceId}${tags ? `&tags=${tags}` : ''}`),

  searchThreads: (geospaceId: string, q: string) =>
    request<{ results: any[] }>(`/threads/search?geospaceId=${geospaceId}&q=${encodeURIComponent(q)}`),

  createThread: (data: { geospaceId: string; title: string; threadType: string; tags?: string[] }) =>
    request<{ thread: any }>('/threads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getThread: (id: string) =>
    request<{ thread: any }>(`/threads/${id}`),

  getMessages: (threadId: string, after?: string, limit?: number) =>
    request<{ messages: any[] }>(`/threads/${threadId}/messages?${after ? `after=${after}&` : ''}${limit ? `limit=${limit}` : ''}`),

  // Venues
  getVenues: (lat: number, lng: number, radius = 500) =>
    request<{ venues: any[] }>(`/venues?lat=${lat}&lng=${lng}&radius=${radius}`),

  nominateVenue: (data: { lat: number; lng: number; name: string }) =>
    request<{ nominationId: string }>('/venues/nominate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Report
  report: (data: { messageId: string; threadId: string; reason: string }) =>
    request<{ ok: true }>('/report', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
