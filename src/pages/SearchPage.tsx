import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePaged } from '../hooks/usePaged'
import { useOnScreen } from '../hooks/useAsync'
import { useSettings } from '../state/settingsContext'
import { VideoCard } from '../components/VideoCard'
import { Banner, ErrorState, GridSkeleton } from '../components/ui'
import { GridIcon, ListIcon } from '../components/icons'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { call, settings, update, failedInstances, lastUsedInstance } = useSettings()

  const paged = usePaged(
    (continuation) => call((api) => api.search(query, continuation)),
    [call, query],
  )

  const [sentinelRef, inView] = useOnScreen<HTMLDivElement>()

  useEffect(() => {
    if (inView && paged.hasMore) paged.loadMore()
  }, [inView, paged])

  if (!query) {
    return (
      <div className="container">
        <ErrorState title="No search query" message="Enter something in the search box to get started." />
      </div>
    )
  }

  return (
    <div className="container">
      {failedInstances.length > 0 ? (
        <Banner variant="warn">
          {failedInstances.join(', ')} unreachable &mdash; showing results from <code>{lastUsedInstance}</code>.
        </Banner>
      ) : null}

      <div className="page-header">
        <div>
          <h1>Results for &ldquo;{query}&rdquo;</h1>
          <p>
            {paged.loading ? 'Searching\u2026' : `${paged.items.length} result${paged.items.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={settings.watchLayout === 'grid' ? 'Switch to list layout' : 'Switch to grid layout'}
          onClick={() => update({ watchLayout: settings.watchLayout === 'grid' ? 'list' : 'grid' })}
        >
          {settings.watchLayout === 'grid' ? <ListIcon size={20} /> : <GridIcon size={20} />}
        </button>
      </div>

      {paged.loading ? <GridSkeleton count={18} /> : null}

      {paged.error ? (
        <ErrorState
          title="Search failed"
          message={paged.error.message}
          hint="The instance may be down or rate limiting. Change it in Settings."
          onRetry={paged.reload}
        />
      ) : null}

      {!paged.loading && !paged.error && paged.items.length === 0 ? (
        <ErrorState title="No results" message={`Nothing matched \u201c${query}\u201d. Try different keywords.`} />
      ) : null}

      {paged.items.length > 0 ? (
        <div className={settings.watchLayout === 'grid' ? 'grid' : 'grid grid--list'}>
          {paged.items.map((video, index) => (
            <VideoCard
              key={`${video.id}-${index}`}
              video={video}
              index={index}
              layout={settings.watchLayout}
            />
          ))}
        </div>
      ) : null}

      {paged.loadingMore ? <GridSkeleton count={6} /> : null}

      {paged.hasMore ? (
        <div ref={sentinelRef} style={{ height: 1 }} />
      ) : paged.items.length > 20 ? (
        <div className="load-more">
          <button type="button" className="button" onClick={() => setParams(params)}>
            All results loaded
          </button>
        </div>
      ) : null}
    </div>
  )
}