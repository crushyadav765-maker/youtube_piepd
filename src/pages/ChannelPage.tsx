import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAsync, useOnScreen } from '../hooks/useAsync'
import { usePaged } from '../hooks/usePaged'
import { useSettings } from '../state/settingsContext'
import { VideoCard } from '../components/VideoCard'
import { Banner, EmptyState, ErrorState, GridSkeleton } from '../components/ui'
import { VerifiedIcon } from '../components/icons'
import { formatCount, formatSubscribers } from '../utils/format'
import type { ChannelInfo, PlaylistInfo } from '../api/types'

type TabKey = 'videos' | 'playlists' | 'about'

export function ChannelPage() {
  const { channelId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { call, settings, failedInstances, lastUsedInstance } = useSettings()
  const tab = (params.get('tab') as TabKey) || 'videos'
  const listLayout = settings.watchLayout === 'list'

  const info = useAsync(() => call((api) => api.channel(channelId)), [call, channelId])

  const videos = usePaged(
    (continuation) => call((api) => api.channelVideos(channelId, continuation)),
    [call, channelId, tab === 'videos'],
  )
  const playlists = usePaged(
    (continuation) => call((api) => api.channelPlaylists(channelId, continuation)),
    [call, channelId, tab === 'playlists'],
  )

  const [sentinelRef, inView] = useOnScreen<HTMLDivElement>()

  useEffect(() => {
    if (!inView) return
    if (tab === 'videos' && videos.hasMore) videos.loadMore()
    if (tab === 'playlists' && playlists.hasMore) playlists.loadMore()
  }, [inView, tab, videos, playlists])

  const channel = info.data

  const setTab = (next: TabKey) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  return (
    <div className="container">
      {failedInstances.length > 0 ? (
        <Banner variant="warn">
          {failedInstances.join(', ')} unreachable &mdash; using <code>{lastUsedInstance}</code>.
        </Banner>
      ) : null}

      {info.loading ? <GridSkeleton count={3} /> : null}

      {info.error ? (
        <ErrorState
          title="Could not load channel"
          message={info.error.message}
          hint="Switch instances in Settings if this keeps happening."
          onRetry={info.reload}
        />
      ) : null}

      {channel ? (
        <>
          <div className="channel-header">
            {channel.banner ? (
              <img className="channel-header__banner" src={channel.banner} alt="" referrerPolicy="no-referrer" />
            ) : null}
            <div className="channel-header__body">
              {channel.avatar ? (
                <img
                  className="channel-header__avatar"
                  src={channel.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="channel-header__avatar" />
              )}
              <div style={{ flex: 1, minWidth: 240 }}>
                <h1 className="channel-header__name">
                  {channel.name}
                  {channel.verified ? <VerifiedIcon size={18} /> : null}
                </h1>
                <p className="channel-header__handle">{channel.id}</p>
                <div className="channel-header__stats">
                  <span>
                    <strong>{formatSubscribers(channel.subscriberCount)}</strong>
                  </span>
                  {channel.totalViews >= 0 ? (
                    <span>
                      <strong>{formatCount(channel.totalViews)}</strong> total views
                    </span>
                  ) : null}
                  {channel.joined ? <span>Joined {new Date(channel.joined).toLocaleDateString()}</span> : null}
                </div>
              </div>
            </div>
            {channel.description ? (
              <p className="channel-header__description">{channel.description.slice(0, 1000)}</p>
            ) : null}
            {channel.tags.length > 0 ? (
              <div className="tag-list">
                {channel.tags.map((tag) => (
                  <Link key={tag} to={`/results?q=${encodeURIComponent(tag)}`} className="chip">
                    {tag}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="tabs">
            {(['videos', 'playlists', 'about'] as TabKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`tab${tab === key ? ' tab--active' : ''}`}
                onClick={() => setTab(key)}
              >
                {key === 'about' ? 'About' : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'videos' ? (
            <>
              {videos.loading ? <GridSkeleton count={18} /> : null}
              {videos.error ? (
                <ErrorState title="Could not load videos" message={videos.error.message} onRetry={videos.reload} />
              ) : null}
              {!videos.loading && videos.items.length === 0 ? (
                <EmptyState title="No videos" message="This channel did not return any videos." />
              ) : null}
              {videos.items.length > 0 ? (
                <div className={listLayout ? 'grid grid--list' : 'grid'}>
                  {videos.items.map((video, index) => (
                    <VideoCard
                    key={`${video.id}-${index}`}
                    video={video}
                    index={index}
                    layout={listLayout ? 'list' : 'grid'}
                  />
                  ))}
                </div>
              ) : null}
              {videos.loadingMore ? <GridSkeleton count={6} /> : null}
              {videos.hasMore ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
            </>
          ) : null}

          {tab === 'playlists' ? (
            <>
              {playlists.loading ? <GridSkeleton count={6} /> : null}
              {!playlists.loading && playlists.items.length === 0 ? (
                <EmptyState
                  title="No playlists"
                  message={
                    info.data && settings.provider === 'piped'
                      ? 'The Piped API does not expose channel playlists \u2014 try an Invidious instance in Settings.'
                      : 'This channel has no public playlists.'
                  }
                />
              ) : null}
              {playlists.items.length > 0 ? (
                <div className="grid grid--dense">
                  {playlists.items.map((playlist) => (
                    <PlaylistGridCard key={playlist.id} playlist={playlist} />
                  ))}
                </div>
              ) : null}
              {playlists.hasMore ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
            </>
          ) : null}

          {tab === 'about' ? <AboutTab channel={channel} /> : null}
        </>
      ) : null}
    </div>
  )
}

function PlaylistGridCard({ playlist }: { playlist: PlaylistInfo }) {
  return (
    <Link to={`/playlist?list=${playlist.id}`} className="card">
      <div className="card__thumb-wrap">
        {playlist.thumbnail ? (
          <img className="card__thumb" src={playlist.thumbnail} alt="" loading="lazy" />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              padding: 16,
              textAlign: 'center',
              fontWeight: 600,
              background: 'var(--bg-raised)',
            }}
          >
            {playlist.title}
          </div>
        )}
        <span className="card__duration">{playlist.videoCount} videos</span>
      </div>
      <div className="card__body">
        <div className="card__meta">
          <h3 className="card__title">{playlist.title}</h3>
          <span className="card__sub">{playlist.authorName}</span>
        </div>
      </div>
    </Link>
  )
}

function AboutTab({ channel }: { channel: ChannelInfo }) {
  return (
    <div style={{ maxWidth: 720 }}>
      {channel.description ? (
        <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{channel.description}</p>
      ) : (
        <EmptyState title="No description" message="This channel has not provided an about section." />
      )}
      <table className="about-table">
        <tbody>
<tr>
            <th>Channel ID</th>
            <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{channel.id}</td>
          </tr>
          <tr>
            <th>Subscribers</th>
            <td>{formatSubscribers(channel.subscriberCount) || '-'}</td>
          </tr>
          <tr>
            <th>Total views</th>
            <td>{channel.totalViews >= 0 ? formatCount(channel.totalViews) : '-'}</td>
          </tr>
          <tr>
            <th>Joined</th>
            <td>
              {channel.joined
                ? new Date(channel.joined).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}