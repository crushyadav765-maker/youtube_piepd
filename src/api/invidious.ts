import { joinUrl, request } from './http'
import { absoluteUrl, firstNonEmpty, toInt, UNKNOWN } from './mapping'
import { relativeToTimestamp } from './piped'
import type {
  ChannelInfo,
  CommentItem,
  CommentsPage,
  Paged,
  PlaylistInfo,
  ProviderApi,
  Subtitle,
  VideoDetail,
  VideoFormat,
  VideoListItem,
} from './types'

interface RawVideoThumbnail {
  quality?: string
  url?: string
  width?: number
  height?: number
}

interface RawVideoItem {
  type?: string
  videoId?: string
  title?: string
  videoThumbnails?: RawVideoThumbnail[]
  author?: string
  authorId?: string
  authorUrl?: string
  authorVerified?: boolean
  authorThumbnails?: RawVideoThumbnail[]
  viewCount?: number
  viewCountText?: string
  published?: number
  publishedText?: string
  lengthSeconds?: number
  liveNow?: boolean
  isUpcoming?: boolean
}

interface RawFormat {
  itag?: number | string
  url?: string
  /** Full mime string including codecs, e.g. `video/mp4; codecs="avc1.42001E, mp4a.40.2"`. */
  type?: string
  mimeType?: string
  container?: string
  quality?: string
  qualityLabel?: string
  resolution?: string
  encoding?: string
  codecs?: string
  bitrate?: string | number
  /** `WxH` string on Invidious, not a byte count. */
  size?: string | number
  clen?: string | number
  init?: string
  index?: string
  projectionType?: string
  audioQuality?: string
  width?: number
  height?: number
  fps?: number
}

interface RawVideoDetail extends RawVideoItem {
  description?: string
  descriptionHtml?: string
  likeCount?: number
  dislikeCount?: number
  subCountText?: string
  isPostLiveDvr?: boolean
  dashUrl?: string
  adaptiveFormats?: RawFormat[]
  formatStreams?: RawFormat[]
  captions?: { label?: string; language_code?: string; url?: string }[]
  recommendedVideos?: RawVideoItem[]
  hlsUrl?: string
}

interface RawChannel {
  author?: string
  authorId?: string
  authorBanners?: RawVideoThumbnail[]
  authorThumbnails?: RawVideoThumbnail[]
  subCount?: number
  totalViews?: number
  joined?: number
  description?: string
  descriptionHtml?: string
  authorVerified?: boolean
  tags?: string[]
  latestVideos?: RawVideoItem[]
  relatedChannels?: unknown[]
  tabs?: string[]
}

interface RawPlaylist {
  playlistId?: string
  title?: string
  playlistThumbnail?: string
  description?: string
  descriptionHtml?: string
  author?: string
  authorId?: string
  authorThumbnails?: RawVideoThumbnail[]
  videoCount?: number
  videos?: RawVideoItem[]
}

interface RawComment {
  author?: string
  authorId?: string
  authorThumbnails?: RawVideoThumbnail[]
  content?: string
  contentHtml?: string
  published?: number
  publishedText?: string
  likeCount?: number
  isHearted?: boolean
  isPinned?: boolean
  isEdited?: boolean
  isCreatorHearted?: boolean
  replies?: RawComment[]
}

interface RawCommentsResponse {
  comments?: RawComment[]
  continuation?: string | null
  error?: string
}

function pickThumbnail(list: RawVideoThumbnail[] | undefined, minWidth = 0): string {
  if (!list || list.length === 0) return ''
  const usable = list.filter((t) => t.url && toInt(t.width, 0) >= minWidth)
  const pool = usable.length > 0 ? usable : list.filter((t) => t.url)
  if (pool.length === 0) return ''
  return pool.reduce((best, current) => (toInt(current.width, 0) > toInt(best.width, 0) ? current : best)).url ?? ''
}

function mapVideoItem(raw: RawVideoItem): VideoListItem {
  const duration = toInt(raw.lengthSeconds, UNKNOWN)
  const published = toInt(raw.published, UNKNOWN)
  return {
    id: firstNonEmpty(raw.videoId),
    title: firstNonEmpty(raw.title, 'Untitled'),
    thumbnail: pickThumbnail(raw.videoThumbnails),
    duration,
    views: toInt(raw.viewCount, UNKNOWN),
    viewsText: firstNonEmpty(raw.viewCountText),
    publishedText: firstNonEmpty(raw.publishedText),
    published: published !== UNKNOWN ? published : relativeToTimestamp(raw.publishedText),
    uploaderName: firstNonEmpty(raw.author),
    uploaderId: firstNonEmpty(raw.authorId),
    uploaderAvatar: pickThumbnail(raw.authorThumbnails, 48),
    uploaderVerified: Boolean(raw.authorVerified),
    live: Boolean(raw.liveNow) || Boolean(raw.isUpcoming),
    isShort: duration >= 0 && duration <= 60,
  }
}

function parseMime(mimeType: string | undefined): { base: string; codecs: string } {
  if (!mimeType) return { base: '', codecs: '' }
  const [base, ...rest] = mimeType.split(';')
  const codecsPart = rest.find((r) => r.trim().startsWith('codecs='))
  const codecs = codecsPart ? codecsPart.trim().replace(/^codecs=["']?/, '').replace(/["']?$/, '') : ''
  return { base: (base ?? '').trim(), codecs }
}

/** Audio codec families: `mp4a` = AAC, plus Opus and Vorbis. */
const AUDIO_CODEC = /(mp4a|opus|vorbis|ac-3|ec-3)/i

function mapFormat(raw: RawFormat, index: number, base: string): VideoFormat {
  // Invidious reports the full mime string (with codecs) in `type`; `mimeType` is absent.
  const { base: mimeBase, codecs } = parseMime(firstNonEmpty(raw.mimeType, raw.type))
  const container = mimeBase.split('/')[1] ?? ''
  const isHls = container.includes('mpegurl')
  const kind = mimeBase.split('/')[0]
  const hasAudio = kind === 'audio' || (!isHls && AUDIO_CODEC.test(codecs))
  const [widthFromSize, heightFromSize] = typeof raw.size === 'string' ? raw.size.split('x') : []
  return {
    itag: toInt(raw.itag, index + 1),
    url: absoluteUrl(firstNonEmpty(raw.url), base),
    mimeType: firstNonEmpty(raw.mimeType, raw.type),
    container: firstNonEmpty(raw.container, container),
    quality: firstNonEmpty(raw.qualityLabel, raw.resolution, raw.quality),
    codecs: firstNonEmpty(raw.codecs, codecs),
    bitrate: toInt(raw.bitrate, 0),
    hasVideo: kind === 'video',
    hasAudio,
    width: toInt(firstNonEmpty(raw.width, widthFromSize), 0),
    height: toInt(firstNonEmpty(raw.height, heightFromSize), 0),
    fps: toInt(raw.fps, 0),
    size: toInt(raw.clen, 0),
    isHls,
  }
}

function mapCaption(raw: { label?: string; language_code?: string; url?: string }, base: string): Subtitle {
  const label = firstNonEmpty(raw.label, raw.language_code, 'Subtitles')
  return {
    label,
    language: firstNonEmpty(raw.language_code),
    url: absoluteUrl(firstNonEmpty(raw.url), base),
    autoGenerated: /auto[- ]?generated/i.test(label),
  }
}

function mapComment(raw: RawComment): CommentItem {
  return {
    id: `${firstNonEmpty(raw.authorId, 'anon')}-${toInt(raw.published, 0)}-${Math.abs(
      (firstNonEmpty(raw.content, 'x').length * 2654435761) % 100000,
    )}`,
    author: firstNonEmpty(raw.author, 'Unknown'),
    authorId: firstNonEmpty(raw.authorId),
    avatar: pickThumbnail(raw.authorThumbnails, 32),
    text: firstNonEmpty(raw.content),
    publishedText: firstNonEmpty(raw.publishedText),
    likes: toInt(raw.likeCount, 0),
    hearted: Boolean(raw.isHearted),
    pinned: Boolean(raw.isPinned),
    creatorReplied: Boolean(raw.isCreatorHearted),
    replies: (raw.replies ?? []).map(mapComment),
  }
}

export class InvidiousApi implements ProviderApi {
  readonly id = 'invidious' as const
  readonly name = 'Invidious'
  readonly instance: string

  constructor(apiUrl: string) {
    this.instance = apiUrl
  }

  private get(path: string, params?: Record<string, string | number | undefined>): string {
    const url = joinUrl(this.instance, `/api/v1${path}`)
    if (!params) return url
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, String(value))
    }
    const query = search.toString()
    return query ? `${url}?${query}` : url
  }

  async trending(region: string): Promise<VideoListItem[]> {
    const raw = await request<RawVideoItem[]>(this.get('/trending', { region }), { timeoutMs: 25000 })
    return (raw ?? []).map(mapVideoItem).filter((v) => v.id !== '')
  }

  async search(query: string, continuation: string | null): Promise<Paged<VideoListItem>> {
    const page = continuation ?? ''
    const raw = await request<RawVideoItem[]>(
      this.get('/search', { q: query, type: 'video', page, sort_by: 'relevance' }),
      { timeoutMs: 25000 },
    )
    const items = (raw ?? []).map(mapVideoItem).filter((v) => v.id !== '')
    return { items, continuation: items.length >= 20 ? String(toInt(page, 0) + 1) : null }
  }

  async suggestions(query: string): Promise<string[]> {
    try {
      const raw = await request<{ suggestions?: string[] }>(this.get('/suggestions', { q: query }), {
        timeoutMs: 12000,
      })
      return (raw.suggestions ?? []).filter((s) => typeof s === 'string')
    } catch {
      return []
    }
  }

  async video(id: string): Promise<VideoDetail> {
    const raw = await request<RawVideoDetail>(this.get(`/videos/${id}`), { timeoutMs: 35000 })
    const muxed = (raw.formatStreams ?? []).map((f, i) => mapFormat(f, i, this.instance))
    const adaptive = (raw.adaptiveFormats ?? []).map((f, i) => mapFormat(f, i, this.instance))

    const formats = [...muxed, ...adaptive].filter((f) => f.url !== '')
    const playable = formats.filter((f) => f.hasVideo)
    const sorted = [...playable].sort((a, b) => b.height - a.height || b.bitrate - a.bitrate)
    const rest = formats.filter((f) => !f.hasVideo)

    return {
      id: firstNonEmpty(raw.videoId, id),
      title: firstNonEmpty(raw.title, 'Untitled'),
      description: firstNonEmpty(raw.description, raw.descriptionHtml),
      thumbnail: pickThumbnail(raw.videoThumbnails, 640),
      duration: toInt(raw.lengthSeconds, UNKNOWN),
      views: toInt(raw.viewCount, UNKNOWN),
      likes: toInt(raw.likeCount, 0),
      dislikes: toInt(raw.dislikeCount, 0),
      publishedText: firstNonEmpty(raw.publishedText),
      published: toInt(raw.published, UNKNOWN),
      uploaderName: firstNonEmpty(raw.author),
      uploaderId: firstNonEmpty(raw.authorId),
      uploaderAvatar: pickThumbnail(raw.authorThumbnails, 48),
      uploaderVerified: Boolean(raw.authorVerified),
      subscriberCount: toInt(String(raw.subCountText ?? '').replace(/[^\d]/g, ''), UNKNOWN),
      live: Boolean(raw.liveNow),
      hlsUrl: raw.hlsUrl ?? null,
      formats: [...sorted, ...rest],
      subtitles: (raw.captions ?? []).map((c) => mapCaption(c, this.instance)),
      related: (raw.recommendedVideos ?? []).map(mapVideoItem).filter((v) => v.id !== ''),
    }
  }

  async comments(id: string, continuation: string | null): Promise<CommentsPage> {
    try {
      const raw = await request<RawCommentsResponse>(
        this.get(`/comments/${id}`, continuation ? { continuation } : undefined),
        { timeoutMs: 25000 },
      )
      if (raw.error) return { comments: [], continuation: null, disabled: true }
      return {
        comments: (raw.comments ?? []).map(mapComment),
        continuation: raw.continuation ?? null,
        disabled: false,
      }
    } catch {
      return { comments: [], continuation: null, disabled: true }
    }
  }

  async channel(id: string): Promise<ChannelInfo> {
    const raw = await request<RawChannel>(this.get(`/channels/${id}`), { timeoutMs: 30000 })
    return {
      id: firstNonEmpty(raw.authorId, id),
      name: firstNonEmpty(raw.author, 'Unknown channel'),
      avatar: pickThumbnail(raw.authorThumbnails, 88),
      banner: pickThumbnail(raw.authorBanners, 1060),
      description: firstNonEmpty(raw.description, raw.descriptionHtml),
      subscriberCount: toInt(raw.subCount, UNKNOWN),
      totalViews: toInt(raw.totalViews, UNKNOWN),
      joined: raw.joined ? new Date(toInt(raw.joined, 0) * 1000).toISOString() : '',
      verified: Boolean(raw.authorVerified),
      tags: raw.tags ?? [],
    }
  }

  async channelVideos(id: string, continuation: string | null): Promise<Paged<VideoListItem>> {
    const raw = await request<{ videos?: RawVideoItem[]; continuation?: string | null }>(
      this.get(`/channels/${id}/videos`, continuation ? { continuation } : undefined),
      { timeoutMs: 30000 },
    )
    return {
      items: (raw.videos ?? []).map(mapVideoItem).filter((v) => v.id !== ''),
      continuation: raw.continuation ?? null,
    }
  }

  async channelPlaylists(id: string, continuation: string | null): Promise<Paged<PlaylistInfo>> {
    const raw = await request<{ playlists?: RawPlaylist[]; continuation?: string | null }>(
      this.get(`/channels/${id}/playlists`, continuation ? { continuation } : undefined),
      { timeoutMs: 30000 },
    )
    const items: PlaylistInfo[] = (raw.playlists ?? []).map((p) => ({
      id: firstNonEmpty(p.playlistId),
      title: firstNonEmpty(p.title, 'Playlist'),
      thumbnail: absoluteUrl(firstNonEmpty(p.playlistThumbnail), this.instance),
      description: firstNonEmpty(p.description),
      authorName: firstNonEmpty(p.author),
      authorId: firstNonEmpty(p.authorId),
      authorAvatar: pickThumbnail(p.authorThumbnails, 48),
      videoCount: toInt(p.videoCount, 0),
      videos: [],
    }))
    return { items: items.filter((p) => p.id !== ''), continuation: raw.continuation ?? null }
  }

  async playlist(id: string): Promise<PlaylistInfo> {
    const raw = await request<RawPlaylist>(this.get(`/playlists/${id}`), { timeoutMs: 30000 })
    return {
      id: firstNonEmpty(raw.playlistId, id),
      title: firstNonEmpty(raw.title, 'Playlist'),
      thumbnail: absoluteUrl(firstNonEmpty(raw.playlistThumbnail), this.instance),
      description: firstNonEmpty(raw.description, raw.descriptionHtml),
      authorName: firstNonEmpty(raw.author),
      authorId: firstNonEmpty(raw.authorId),
      authorAvatar: pickThumbnail(raw.authorThumbnails, 48),
      videoCount: toInt(raw.videoCount, 0),
      videos: (raw.videos ?? []).map(mapVideoItem).filter((v) => v.id !== ''),
    }
  }

  async playlistVideos(): Promise<Paged<VideoListItem>> {
    return { items: [], continuation: null }
  }
}