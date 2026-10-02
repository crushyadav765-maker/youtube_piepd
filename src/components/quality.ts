import type { VideoFormat } from '../api/types'
import { formatBitrate, formatBytes } from '../utils/format'

export interface QualityOption {
  key: string
  label: string
  detail: string
  format: VideoFormat
  /** True when the stream already contains an audio track. */
  playable: boolean
}

export function formatHeight(format: VideoFormat): number {
  return format.height > 0 ? format.height : Number.parseInt(format.quality, 10) || 0
}

export function buildQualityOptions(formats: VideoFormat[]): QualityOption[] {
  const muxed = formats.filter((f) => f.hasAudio && f.hasVideo && f.url !== '')
  const videoOnly = formats.filter((f) => f.hasVideo && !f.hasAudio && f.url !== '')

  const toOption = (f: VideoFormat, playable: boolean): QualityOption => {
    const height = formatHeight(f)
    const label = height > 0 ? `${height}p` : f.quality || 'source'
    const details: string[] = []
    if (f.fps > 0) details.push(`${Math.round(f.fps)}fps`)
    if (f.size > 0) details.push(formatBytes(f.size))
    else if (f.bitrate > 0) details.push(formatBitrate(f.bitrate))
    const codec = f.codecs.split('.')[0]
    if (codec) details.push(codec)
    if (!playable) details.push('no audio track')
    return { key: String(f.itag), label, detail: details.join(' \u00b7 '), format: f, playable }
  }

  const options = [...muxed.map((f) => toOption(f, true)), ...videoOnly.map((f) => toOption(f, false))]
  options.sort((a, b) => formatHeight(b.format) - formatHeight(a.format) || b.format.bitrate - a.format.bitrate)

  return options.filter((option, index) => options.findIndex((o) => o.label === option.label) === index)
}