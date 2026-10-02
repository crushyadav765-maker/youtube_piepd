import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { useSettings } from '../state/settingsContext'
import { Player } from '../components/Player'
import { VideoCard } from '../components/VideoCard'
import { Comments } from '../components/Comments'
import { Banner, ErrorState, ListSkeleton } from '../components/ui'
import { DislikeIcon, ExternalIcon, LikeIcon, ShareIcon, VerifiedIcon } from '../components/icons'
import {
  formatExactViews,
  formatLongDuration,
  formatRelativeTime,
  formatSubscribers,
} from '../utils/format'

export function WatchPage() {
  const [params] = useSearchParams()
  const videoId = params.get('v') ?? ''
  const startAt = Number.parseFloat(params.get('t') ?? '0') || 0

  if (!videoId) {
    return <ErrorState title="No video selected" message="This watch page is missing a video id." />
  }

  // Remounting on id change resets player, like and description state for free.
  return <WatchContent key={videoId} videoId={videoId} startAt={startAt} />
}

function WatchContent({ videoId, startAt }: { videoId: string; startAt: number }) {
  const navigate = useNavigate()
  const { call, settings, addToHistory, failedInstances, lastUsedInstance } = useSettings()

  const [expanded, setExpanded] = useState(false)
  const [liked, setLiked] = useState(false)
  const [disliked, setDisliked] = useState(false)

  const { data: detail, error, loading, reload } = useAsync(
    () => call((api) => api.video(videoId)),
    [call, videoId],
  )

  useEffect(() => {
    if (!detail || !settings.saveHistory) return
    addToHistory({
      id: detail.id,
      title: detail.title,
      thumbnail: detail.thumbnail,
      uploaderName: detail.uploaderName,
    })
  }, [detail, settings.saveHistory, addToHistory])

  const playNext = () => {
    const next = detail?.related[0]
    if (!next) return
    navigate(`/watch?v=${next.id}`)
  }

  if (loading) {
    return (
      <div className="container">
        <div className="skeleton" style={{ aspectRatio: '16 / 9', borderRadius: 12 }} />
        <ListSkeleton count={3} />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="container">
        <ErrorState
          title="Could not load this video"
          message={error?.message ?? 'Unknown error'}
          hint="Try a different instance in Settings, or reload the page."
          onRetry={reload}
        />
      </div>
    )
  }

  const stats = [
    formatExactViews(detail.views),
    detail.publishedText || formatRelativeTime(detail.published),
    detail.duration >= 0 ? formatLongDuration(detail.duration) : '',
  ].filter(Boolean)

  const descriptionText =
    detail.description ||
    'No description provided by the uploader. Note: some Piped instances return an empty description.'

  return (
    <div className="container">
      {failedInstances.length > 0 ? (
        <Banner variant="warn">
          {failedInstances.join(', ')} unreachable &mdash; streaming from <code>{lastUsedInstance}</code>.
        </Banner>
      ) : null}

      <div className="watch">
        <div style={{ minWidth: 0 }}>
          <Player
            detail={detail}
            autoplay={settings.autoplay}
            preferredQuality={settings.defaultQuality}
            startAt={startAt}
            onEnded={settings.autoplayNext ? playNext : undefined}
          />

          <div className="watch__meta">
            <h1 className="watch__title">{detail.title}</h1>

            <div className="watch__row">
              <div className="watch__uploader">
                {detail.uploaderAvatar ? (
                  <img
                    className="watch__avatar"
                    src={detail.uploaderAvatar}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <div style={{ minWidth: 0 }}>
                  <div className="watch__uploader-name">
                    {detail.uploaderId ? (
                      <Link to={`/channel/${detail.uploaderId}`}>{detail.uploaderName}</Link>
                    ) : (
                      detail.uploaderName
                    )}
                    {detail.uploaderVerified ? <VerifiedIcon size={14} /> : null}
                  </div>
                  <div className="watch__uploader-sub">{formatSubscribers(detail.subscriberCount)}</div>
                </div>
                {detail.uploaderId ? (
                  <Link to={`/channel/${detail.uploaderId}`} className="action-pill">
                    Subscribe
                  </Link>
                ) : null}
              </div>

              <div className="watch__actions">
                <div className="watch__stats">
                  <strong>{stats[0]}</strong>
                  {stats[1] ? <> · {stats[1]}</> : null}
                </div>
                <button
                  type="button"
                  className={`action-pill${liked ? ' action-pill--active' : ''}`}
                  aria-pressed={liked}
                  onClick={() => {
                    setLiked((v) => !v)
                    setDisliked(false)
                  }}
                >
                  <LikeIcon size={18} />
                  {detail.likes > 0 ? detail.likes.toLocaleString('en-US') : 'Like'}
                </button>
                <button
                  type="button"
                  className={`action-pill${disliked ? ' action-pill--active' : ''}`}
                  aria-pressed={disliked}
                  onClick={() => {
                    setDisliked((v) => !v)
                    setLiked(false)
                  }}
                >
                  <DislikeIcon size={18} />
                </button>
                <button
                  type="button"
                  className="action-pill"
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? window.location.href : ''
                    void navigator.clipboard?.writeText(url)
                  }}
                >
                  <ShareIcon size={18} />
                  Share
                </button>
              </div>
            </div>

            <div className={`description${expanded ? '' : ' description--collapsed'}`}>
              <div className="description__stats">
                <span>{stats[0]}</span>
                {detail.likes > 0 ? <span>{detail.likes.toLocaleString('en-US')} likes</span> : null}
                {detail.dislikes > 0 ? <span>{detail.dislikes.toLocaleString('en-US')} dislikes</span> : null}
                {detail.publishedText ? <span>{detail.publishedText}</span> : null}
                {detail.duration >= 0 ? <span>{formatLongDuration(detail.duration)}</span> : null}
              </div>
              <div className="description__text">{descriptionText}</div>
              <button
                type="button"
                className="description__toggle"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            </div>

            <Comments videoId={videoId} />
          </div>
        </div>

        <aside>
          {settings.autoplayNext && detail.related.length > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0' }}>
              <button type="button" className="action-pill" onClick={playNext}>
                Play next video
              </button>
            </div>
          ) : null}
          <div className="grid grid--list">
            {detail.related.map((video, index) => (
              <VideoCard key={`${video.id}-${index}`} video={video} index={index} layout="list" showUploader={false} />
            ))}
          </div>
          <div style={{ padding: '24px 4px' }}>
            <a
              className="action-pill"
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalIcon size={16} />
              View on YouTube
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}