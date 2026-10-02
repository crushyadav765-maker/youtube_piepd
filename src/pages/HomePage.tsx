import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { useSettings } from '../state/settingsContext'
import { VideoCard } from '../components/VideoCard'
import { Banner, ErrorState, GridSkeleton } from '../components/ui'
import { FilmIcon } from '../components/icons'

const TABS = [
  { label: 'All', query: '' },
  { label: 'Music', query: 'music' },
  { label: 'Gaming', query: 'gaming' },
  { label: 'News', query: 'news' },
  { label: 'Podcasts', query: 'podcast' },
  { label: 'Tech', query: 'technology' },
  { label: 'Lo-fi', query: 'lofi mix' },
  { label: 'Cooking', query: 'cooking' },
  { label: 'Fitness', query: 'workout' },
  { label: 'Travel', query: 'travel vlog' },
  { label: 'Science', query: 'science' },
]

export function HomePage() {
  const { call, settings, failedInstances, lastUsedInstance } = useSettings()

  const { data, error, loading, reload } = useAsync(
    () => call((api) => api.trending(settings.region)),
    [call, settings.region],
  )

  return (
    <div className="container">
      {failedInstances.length > 0 ? (
        <Banner variant="warn">
          {failedInstances.join(', ')} {failedInstances.length === 1 ? 'was' : 'were'} unreachable. Falling back to{' '}
          <code>{lastUsedInstance}</code>.
        </Banner>
      ) : null}

      <div className="chips">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            to={tab.query ? `/results?q=${encodeURIComponent(tab.query)}` : '/trending'}
            className={`chip${tab.query === '' ? ' chip--active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="page-header">
        <div>
          <h1>Trending in {settings.region}</h1>
          <p>Powered by Piped and Invidious instances. No ads, no tracking.</p>
        </div>
      </div>

      {loading ? <GridSkeleton /> : null}
      {error ? (
        <ErrorState
          title="Could not load trending videos"
          message={error.message}
          hint="Try switching to a different instance in Settings."
          onRetry={reload}
        />
      ) : null}

      {data && data.length === 0 ? (
        <ErrorState
          title="Nothing to show"
          message="The instance returned an empty trending list."
          onRetry={reload}
        />
      ) : null}

      {data && data.length > 0 ? (
        <div className="grid">
          {data.map((video, index) => (
            <VideoCard key={`${video.id}-${index}`} video={video} index={index} />
          ))}
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div className="state">
          <FilmIcon size={32} />
          <p className="state__message">
            Search for anything, or pick an instance in <Link to="/settings" className="link">Settings</Link>.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function TrendingPage() {
  return <HomePage />
}