export const UNKNOWN = -1

export function parseVideoIdFromPath(url: string | undefined | null): string {
  if (!url) return ''
  const queryMatch = url.match(/[?&]v=([^&/]+)/)
  if (queryMatch?.[1]) return queryMatch[1]
  const shortMatch = url.match(/\/shorts\/([^/?#]+)/)
  if (shortMatch?.[1]) return shortMatch[1]
  const bareMatch = url.match(/watch\/(?:v=)?([^/?#]+)/)
  if (bareMatch?.[1]) return bareMatch[1]
  const idMatch = url.match(/\/([\w-]{11})(?:\/|$|\?|#)/)
  return idMatch?.[1] ?? ''
}

export function parseChannelIdFromPath(url: string | undefined | null): string {
  if (!url) return ''
  const match = url.match(/\/channel\/([\w-]+)/)
  return match?.[1] ?? ''
}

export function toInt(value: unknown, fallback = UNKNOWN): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return fallback
    const plain = Number(trimmed)
    if (Number.isFinite(plain)) return plain
    const grouped = Number(trimmed.replace(/[^\d.-]/g, ''))
    if (Number.isFinite(grouped) && trimmed !== '') return grouped
  }
  return fallback
}

export function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return ''
}

export function absoluteUrl(url: string, base: string): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('//')) return `https:${url}`
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}