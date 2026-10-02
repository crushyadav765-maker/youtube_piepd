const NUMBER_FORMAT = new Intl.NumberFormat('en-US')
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export function formatViews(views: number, fallbackText = ''): string {
  if (views > 0) return `${COMPACT.format(views)} views`
  if (views === 0) return 'No views'
  return fallbackText
}

export function formatExactViews(views: number): string {
  return views > 0 ? NUMBER_FORMAT.format(views) : 'No views'
}

export function formatCount(value: number): string {
  if (value < 0) return ''
  if (value === 0) return '0'
  return COMPACT.format(value)
}

export function formatDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return ''
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function formatLongDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return ''
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} hour${h === 1 ? '' : 's'}`)
  if (m > 0) parts.push(`${m} minute${m === 1 ? '' : 's'}`)
  if (s > 0 && h === 0) parts.push(`${s} second${s === 1 ? '' : 's'}`)
  return parts.join(', ')
}

export function formatPublished(publishedText: string, published: number): string {
  if (publishedText && publishedText.toLowerCase() !== 'unknown') return publishedText
  if (published <= 0) return ''
  return `${formatRelativeTime(published)} ago`
}

export function formatRelativeTime(unixSeconds: number): string {
  if (unixSeconds <= 0) return 'unknown'
  const delta = Math.floor(Date.now() / 1000) - unixSeconds
  if (delta < 60) return 'just now'

  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [31_536_000, 'year'],
    [2_592_000, 'month'],
    [604_800, 'week'],
    [86_400, 'day'],
    [3_600, 'hour'],
    [60, 'minute'],
  ]
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [size, unit] of units) {
    if (delta >= size) return formatter.format(-Math.floor(delta / size), unit)
  }
  return 'just now'
}

export function formatSubscribers(count: number): string {
  if (count < 0) return ''
  if (count === 0) return '0 subscribers'
  return `${COMPACT.format(count)} subscriber${count === 1 ? '' : 's'}`
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatBitrate(bitsPerSecond: number): string {
  if (bitsPerSecond <= 0) return ''
  return bitsPerSecond >= 1_000_000
    ? `${(bitsPerSecond / 1_000_000).toFixed(1)} Mbps`
    : `${Math.round(bitsPerSecond / 1000)} kbps`
}