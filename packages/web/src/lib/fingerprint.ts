export async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency ?? 'unknown',
  ].join('|')

  const encoder = new TextEncoder()
  const data = encoder.encode(components)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
