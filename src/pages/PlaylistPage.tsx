import { Link, useSearchParams } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { useSettings } from '../state/settingsContext'
import { VideoCard } from '../components/VideoCard'
import { Banner, ErrorState, ListSkeleton } from '../components/ui'
import { PlayIcon } from '../components/icons'
import { formatCount } from '../utils/format'

export function PlaylistPage() {
  const [params] = useSearchParams()
  const playlistId = params.get('list') ?? ''
  const { call, settings, failedInstances, lastUsedInstance } = useSettings()

  const { data, error, loading, reload } = useAsync(
    () => call((api) => api.playlist(playlistId)),
    [call, playlistId],
  )

  if (!playlistId) {
    return (
      <div className="container">
        <ErrorState title="No playlist selected" message="This page is missing a playlist id." />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container">
        <div className="skeleton" style={{ width: 300, aspectRatio: '16 / 9', borderRadius: 12 }} />
        <ListSkeleton count={5} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container">
        <ErrorState
          title="Could not load playlist"
          message={error?.message ?? 'Unknown error'}
          onRetry={reload}
        />
      </div>
    )
  }

  const firstVideo = data.videos[0]
  const listLayout = settings.watchLayout === 'list'

  return (
    <div className="container">
      {failedInstances.length > 0 ? (
        <Banner variant="warn">
          {failedInstances.join(', ')} unreachable &mdash; using <code>{lastUsedInstance}</code>.
        </Banner>
      ) : null}

      <div className="playlist-header">
        {data.thumbnail ? (
          <img className="playlist-header__cover" src={data.thumbnail} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="playlist-header__cover" />
        )}
        <div className="playlist-header__info">
          <h1 className="playlist-header__title">{data.title}</h1>
          <p className="playlist-header__meta">
            {data.authorName ? `${data.authorName} · ` : ''}
            {formatCount(data.videoCount || data.videos.length)} videos
          </p>
          {data.authorId ? (
            <p className="playlist-header__meta" style={{ marginTop: 4 }}>
              <Link to={`/channel/${data.authorId}`} className="link">
                View channel
              </Link>
            </p>
          ) : null}
          {data.description ? <p className="playlist-header__description">{data.description.slice(0, 800)}</p> : null}
          {firstVideo ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Link to={`/watch?v=${firstVideo.id}`} className="button button--primary">
                <PlayIcon size={18} />
                Play all
              </Link>
              {data.authorId ? (
                <Link to={`/channel/${data.authorId}`} className="button button--ghost">
                  View channel
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {data.videos.length === 0 ? (
        <ErrorState title="Empty playlist" message="This playlist does not contain any videos." />
      ) : (
        <div className={listLayout ? 'grid grid--list' : 'grid'}>
          {data.videos.map((video, index) => (
            <VideoCard
              key={`${video.id}-${index}`}
              video={video}
              index={index}
              layout={listLayout ? 'list' : 'grid'}
              showUploader={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}