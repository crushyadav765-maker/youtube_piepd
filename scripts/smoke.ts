import { withFailover } from '../src/api/index'
import type { ProviderApi } from '../src/api/types'
import type { VideoDetail } from '../src/api/types'

const VIDEO_ID = 'dQw4w9WgXcQ'
const CHANNEL_ID = 'UCXuqSBlHAE6Xw-yeJA0Tunw'
const PLAYLIST_ID = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'

let passed = 0
let failed = 0

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    failed += 1
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function grab<T>(instanceId: string, label: string, op: (a: ProviderApi) => Promise<T>): Promise<T | null> {
  try {
    const result = await withFailover(instanceId, op)
    const failedFirst = result.failedInstances.length > 0 ? result.failedInstances.join(', ') : 'none'
    console.log(`  >> served by ${result.usedInstance} (failed before success: ${failedFirst})`)
    return result.value
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${label} — ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

async function suite(name: string, instanceId: string): Promise<void> {
  console.log(`\n### ${name}  (primary instance: ${instanceId})`)

  const trending = await grab(instanceId, 'trending', (a) => a.trending('US'))
  if (trending) {
    check('trending returns items', trending.length > 0, `${trending.length} items`)
    const f = trending[0]
    check('  id present', Boolean(f?.id), f?.id)
    check('  title present', Boolean(f?.title), f?.title?.slice(0, 45))
    check('  thumbnail absolute', f?.thumbnail.startsWith('http'), f?.thumbnail.slice(0, 58))
    check('  uploader name', Boolean(f?.uploaderName), f?.uploaderName)
    check('  views numeric', typeof f?.views === 'number', String(f?.views))
    check('  duration numeric', typeof f?.duration === 'number', String(f?.duration))
  }

  const search = await grab(instanceId, 'search', (a) => a.search('lofi hip hop', null))
  if (search) {
    check('search returns items', search.items.length > 0, `${search.items.length} items`)
    const f = search.items[0]
    check('  video id is 11 chars', f?.id.length === 11, f?.id)
    check('  thumbnail absolute', f?.thumbnail.startsWith('http'), f?.thumbnail.slice(0, 58))
    if (search.continuation) {
      const page2 = await grab(instanceId, 'search page 2', (a) => a.search('lofi hip hop', search.continuation))
      check('  page 2 loads', Boolean(page2 && page2.items.length > 0), `${page2?.items.length ?? 0} items`)
    } else {
      console.log('  .. no continuation token returned')
    }
  }

  const video = await grab(instanceId, 'video', (a) => a.video(VIDEO_ID))
  if (video) checkVideo(video)

  const comments = await grab(instanceId, 'comments', (a) => a.comments(VIDEO_ID, null))
  if (comments) {
    console.log(
      `  .. comments: ${comments.comments.length} returned, disabled=${comments.disabled}` +
        (comments.comments[0] ? `, first author="${comments.comments[0].author}"` : ''),
    )
  }

  const channel = await grab(instanceId, 'channel', (a) => a.channel(CHANNEL_ID))
  if (channel) {
    check('channel name', channel.name.length > 0, channel.name)
    check('channel id', Boolean(channel.id), channel.id)
    check('channel avatar absolute', channel.avatar.startsWith('http'), channel.avatar.slice(0, 58))
    check('channel subscribers >= 0', channel.subscriberCount >= 0, String(channel.subscriberCount))
  }

  const channelVideos = await grab(instanceId, 'channel videos', (a) => a.channelVideos(CHANNEL_ID, null))
  if (channelVideos) {
    check('channel videos mapped', channelVideos.items.length > 0, `${channelVideos.items.length} videos`)
    check('  ids valid', channelVideos.items.every((v) => v.id.length === 11))
  }

  const playlist = await grab(instanceId, 'playlist', (a) => a.playlist(PLAYLIST_ID))
  if (playlist) {
    check('playlist title', playlist.title.length > 0, playlist.title.slice(0, 45))
    check('playlist videos mapped', playlist.videos.length > 0, `${playlist.videos.length} videos`)
  }
}

function checkVideo(video: VideoDetail): void {
  check('video title', video.title.length > 0, video.title.slice(0, 50))
  check('video thumbnail absolute', video.thumbnail.startsWith('http'), video.thumbnail.slice(0, 58))
  check('formats present', video.formats.length > 0, `${video.formats.length} formats`)

  const muxed = video.formats.filter((f) => f.hasAudio && f.hasVideo && f.url !== '')
  const videoOnly = video.formats.filter((f) => f.hasVideo && !f.hasAudio && f.url !== '')
  const audioOnly = video.formats.filter((f) => !f.hasVideo && f.url !== '')

  check('at least one muxed format', muxed.length > 0, `${muxed.length} muxed / ${videoOnly.length} video-only / ${audioOnly.length} audio-only`)

  const best = [...muxed].sort((a, b) => b.height - a.height || b.bitrate - a.bitrate)[0]
  check('best format url absolute', best?.url.startsWith('http'), best?.url.slice(0, 72))
  check('best format height known', (best?.height ?? 0) > 0, `${best?.height}p @ ${best?.bitrate} bps`)

  check('subtitles mapped', video.subtitles.length > 0, `${video.subtitles.length} tracks`)
  check('subtitle urls absolute', video.subtitles.every((s) => s.url.startsWith('http')), video.subtitles[0]?.url.slice(0, 58))
  check('related videos mapped', video.related.length > 0, `${video.related.length} related`)
  check('related ids valid', video.related.every((v) => v.id.length === 11))
  check('uploader id mapped', Boolean(video.uploaderId), video.uploaderId || '(none)')
}

function polyfillLocalStorage(): void {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  })
}

async function main(): Promise<void> {
  polyfillLocalStorage()
  console.log('PipeTube API smoke test\n========================')

  for (const [name, id] of [
    ['Piped', 'private-coffee'],
    ['Invidious', 'f5'],
  ] as const) {
    await suite(name, id)
  }

  console.log(`\n===== ${passed} passed, ${failed} failed =====`)
  if (failed > 0) process.exitCode = 1
}

void main()