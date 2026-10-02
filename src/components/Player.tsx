import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Hls from 'hls.js'
import type { Subtitle, VideoDetail } from '../api/types'
import { buildQualityOptions } from './quality'
import type { QualityOption } from './quality'
import { AlertIcon, PlayIcon, SubtitlesIcon } from './icons'
import { Menu } from './ui'

type HlsInstance = Hls

/**
 * Turns a `<video>` error into something actionable. Instances differ a lot in how
 * they serve media, so this distinguishes a blocked request from a bad file.
 */
function describePlaybackFailure(video: HTMLVideoElement): string {
  switch (video.error?.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return 'The stream host refused the request. Try a different instance in Settings.'
    case MediaError.MEDIA_ERR_DECODE:
      return 'This browser could not decode the selected format. Try a lower quality.'
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'The selected format is not playable. Try another quality or instance.'
    default:
      return 'Playback failed. Try another quality or a different instance in Settings.'
  }
}

interface PlayerProps {
  detail: VideoDetail
  autoplay: boolean
  preferredQuality: string
  startAt?: number
  onEnded?: () => void
}

export function Player({ detail, autoplay, preferredQuality, startAt = 0, onEnded }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<HlsInstance | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [subtitleKey, setSubtitleKey] = useState<string | null>(null)
  const [needsGesture, setNeedsGesture] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = useMemo(() => buildQualityOptions(detail.formats), [detail.formats])

  // Derived default: the user's explicit pick wins, otherwise the preferred quality.
  const selected: QualityOption | null = useMemo(() => {
    const explicit = options.find((o) => o.key === selectedKey)
    if (explicit) return explicit

    if (preferredQuality !== 'auto') {
      const preferred = options.find((o) => o.label === `${preferredQuality}p` && o.playable)
      if (preferred) return preferred
    }

    const target = preferredQuality === 'auto' ? 1080 : Number.parseInt(preferredQuality, 10) || 1080
    return options.find((o) => o.playable && (o.format.height || 0) <= target) ??
      options.find((o) => o.playable) ??
      options[0] ??
      null
  }, [options, preferredQuality, selectedKey])

  const activeSubtitle = useMemo<Subtitle | null>(
    () => detail.subtitles.find((s) => s.label === subtitleKey) ?? null,
    [detail.subtitles, subtitleKey],
  )

  const source = detail.hlsUrl ?? selected?.format.url ?? null
  // A format can itself be an HLS manifest (Piped's LBRY HLS mirrors). Those need
  // hls.js too, otherwise the browser gets a manifest it cannot parse as media.
  const isHlsSource = Boolean(detail.hlsUrl) || Boolean(selected?.format.isHls)

  /**
   * Attempts playback and reports the real reason for a failure. Only
   * `NotAllowedError` is a genuine browser autoplay block; anything else means the
   * media itself could not be loaded.
   */
  const startPlayback = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch((reason: unknown) => {
      const name = reason instanceof DOMException ? reason.name : ''
      if (name === 'NotAllowedError') {
        setNeedsGesture(true)
        return
      }
      setError(describePlaybackFailure(video))
      setNeedsGesture(false)
    })
  }, [])

  const handleMediaError = useCallback(() => {
    const video = videoRef.current
    if (video) setError(describePlaybackFailure(video))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !source) return

    let cancelled = false
    setError(null)
    setNeedsGesture(false)
    hlsRef.current?.destroy()
    hlsRef.current = null

    if (isHlsSource) {
      // hls.js is only needed for live streams, so it is loaded on demand.
      void (async () => {
        try {
          const { default: HlsCtor, Events, ErrorTypes } = await import('hls.js')
          if (cancelled) return

          if (!HlsCtor.isSupported()) {
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = source
              if (autoplay) startPlayback()
              return
            }
            setError('This browser cannot play HLS streams.')
            return
          }

          const hls = new HlsCtor({ enableWorker: true, lowLatencyMode: true })
          hls.on(Events.MANIFEST_PARSED, () => {
            if (autoplay) startPlayback()
          })
          hls.on(Events.ERROR, (_event, data) => {
            if (!data.fatal) return
            if (data.type === ErrorTypes.NETWORK_ERROR) {
              setError('Could not reach the stream host. This instance may not allow direct playback.')
            } else if (data.type === ErrorTypes.MEDIA_ERROR) {
              setError('The stream could not be decoded.')
            } else {
              setError('Playback failed while loading the stream.')
            }
          })
          hls.loadSource(source)
          hls.attachMedia(video)
          hlsRef.current = hls
        } catch {
          if (!cancelled) setError('Could not load the HLS player.')
        }
      })()

      return () => {
        cancelled = true
        hlsRef.current?.destroy()
        hlsRef.current = null
      }
    }

    if (video.src !== source) {
      video.src = source
      video.load()
    }
    if (autoplay) startPlayback()
    return () => {
      cancelled = true
    }
  }, [source, isHlsSource, autoplay, startPlayback])

  useEffect(() => {
    const video = videoRef.current
    if (!video || startAt <= 0) return
    const seek = () => {
      if (video.currentTime < 1 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(startAt, Math.max(video.duration - 1, 0))
      }
    }
    video.addEventListener('loadedmetadata', seek)
    return () => video.removeEventListener('loadedmetadata', seek)
  }, [startAt, source])

  useEffect(() => () => hlsRef.current?.destroy(), [])

  // Keep the screen awake while a live stream is playing.
  useEffect(() => {
    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock?.request('screen')
        wakeLockRef.current = sentinel ?? null
      } catch {
        wakeLockRef.current = null
      }
    }
    if (detail.live && document.visibilityState === 'visible') void acquire()
    return () => {
      wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
    }
  }, [detail.live])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      setError(null)
      startPlayback()
    } else {
      video.pause()
    }
  }, [startPlayback])

  const qualityItems = options.map((option) => ({
    key: option.key,
    label: option.label,
    sublabel: option.detail,
    active: option.key === selected?.key,
    onSelect: () => setSelectedKey(option.key),
  }))

  const subtitleItems = [
    { key: 'off', label: 'Off', active: subtitleKey === null, onSelect: () => setSubtitleKey(null) },
    ...detail.subtitles.map((subtitle) => ({
      key: subtitle.label,
      label: subtitle.label,
      sublabel: subtitle.autoGenerated ? 'auto-generated' : undefined,
      active: subtitleKey === subtitle.label,
      onSelect: () => setSubtitleKey(subtitle.label),
    })),
  ]

  return (
    <div className="player">
      <video
        ref={videoRef}
        controls
        playsInline
        poster={detail.thumbnail || undefined}
        onError={handleMediaError}
        onEnded={onEnded}
      >
        {activeSubtitle ? (
          <track
            key={activeSubtitle.url}
            kind="subtitles"
            src={activeSubtitle.url}
            srcLang={activeSubtitle.language || 'en'}
            label={activeSubtitle.label}
            default
          />
        ) : null}
      </video>

      {needsGesture && !error ? (
        <button type="button" className="player__center-play" onClick={togglePlay} aria-label="Play video">
          <span className="player__big-play">
            <PlayIcon size={30} />
          </span>
        </button>
      ) : null}

      {error ? (
        <div className="player__overlay">
          <AlertIcon size={28} />
          <span>{error}</span>
        </div>
      ) : null}

      {!source && !error ? (
        <div className="player__overlay">
          <AlertIcon size={28} />
          <span>No playable format available for this video on the current instance.</span>
        </div>
      ) : null}

      {(options.length > 0 || detail.subtitles.length > 0) && (
        <div style={{ position: 'absolute', top: 52, right: 12, display: 'flex', gap: 8 }}>
          {options.length > 0 ? (
            <Menu
              header="Quality"
              items={qualityItems}
              trigger={({ toggle }) => (
                <button type="button" className="action-pill" onClick={toggle}>
                  {selected?.label ?? 'Quality'}
                </button>
              )}
            />
          ) : null}
          {detail.subtitles.length > 0 ? (
            <Menu
              header="Subtitles"
              items={subtitleItems}
              trigger={({ toggle }) => (
                <button
                  type="button"
                  className={`action-pill${subtitleKey ? ' action-pill--active' : ''}`}
                  aria-label="Subtitles"
                  onClick={toggle}
                >
                  <SubtitlesIcon size={18} />
                  {subtitleKey ? activeSubtitle?.language || 'CC' : 'CC'}
                </button>
              )}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}