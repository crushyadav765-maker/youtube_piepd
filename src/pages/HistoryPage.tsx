import { Link } from 'react-router-dom'
import { useSettings } from '../state/settingsContext'
import { formatRelativeTime } from '../utils/format'
import { EmptyState } from '../components/ui'
import { HistoryIcon, TrashIcon } from '../components/icons'

export function HistoryPage() {
  const { history, clearHistory } = useSettings()

  if (history.length === 0) {
    return (
      <div className="container">
        <EmptyState
          icon={<HistoryIcon size={40} />}
          title="No watch history"
          message="Videos you watch will appear here. History is stored only in this browser."
        />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Watch history</h1>
          <p>{history.length} video{history.length === 1 ? '' : 's'} · stored locally</p>
        </div>
        <button type="button" className="button button--danger" onClick={clearHistory}>
          <TrashIcon size={16} />
          Clear history
        </button>
      </div>

      <div className="grid grid--list">
        {history.map((entry) => (
          <Link key={entry.id} to={`/watch?v=${entry.id}`} className="card card--list">
            <div className="card__thumb-wrap">
              {entry.thumbnail ? (
                <img className="card__thumb" src={entry.thumbnail} alt="" loading="lazy" />
              ) : null}
            </div>
            <div className="card__body">
              <div className="card__meta">
                <h3 className="card__title">{entry.title}</h3>
                <span className="card__sub">
                  {entry.uploaderName} · watched {formatRelativeTime(Math.floor(entry.watchedAt / 1000))}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}