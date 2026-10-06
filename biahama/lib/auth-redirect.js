export function safeReturnPath(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback
  const url = new URL(value, 'https://www.biahama.com')
  return url.origin === 'https://www.biahama.com' ? url.pathname + url.search + url.hash : fallback
}
