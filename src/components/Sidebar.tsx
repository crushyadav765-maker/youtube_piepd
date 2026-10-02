import { NavLink, Link } from 'react-router-dom'
import { HistoryIcon, HomeIcon, PlayIcon, SettingsIcon, TrendingIcon } from './icons'
import { useSettings } from '../state/settingsContext'
import { formatRelativeTime } from '../utils/format'

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { settings, history } = useSettings()

  const links = [
    { to: '/', label: 'Home', icon: HomeIcon, end: true },
    { to: '/trending', label: 'Trending', icon: TrendingIcon, end: false },
    { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
  ]

  return (
    <nav className={`sidebar${open ? '' : ' sidebar--collapsed'}`} aria-label="Main navigation">
      <div className="sidebar__section">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
          >
            <span className="sidebar__link-icon">
              <Icon size={22} />
            </span>
            <span className="sidebar__link-label">{label}</span>
          </NavLink>
        ))}
      </div>

      {settings.saveHistory ? (
        <>
          <div className="sidebar__divider" />
          <div className="sidebar__section">
            <p className="sidebar__title">History</p>
            {history.length === 0 ? (
              <p className="sidebar__empty">Videos you watch will show up here.</p>
            ) : (
              history.slice(0, 24).map((entry) => (
                <Link
                  key={entry.id}
                  to={`/watch?v=${entry.id}`}
                  onClick={onNavigate}
                  className="sidebar__history-item"
                  title={entry.title}
                >
                  {entry.thumbnail ? (
                    <img className="sidebar__history-thumb" src={entry.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <span className="sidebar__history-thumb" style={{ display: 'grid', placeItems: 'center' }}>
                      <PlayIcon size={16} />
                    </span>
                  )}
                  <span className="sidebar__history-body">
                    <span className="sidebar__history-title">{entry.title}</span>
                    <span className="sidebar__history-meta">
                      {entry.uploaderName} · {formatRelativeTime(Math.floor(entry.watchedAt / 1000))}
                    </span>
                  </span>
                </Link>
              ))
            )}
            {history.length > 0 ? (
              <>
                <div className="sidebar__divider" />
                <NavLink
                  to="/history"
                  onClick={onNavigate}
                  className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
                >
                  <span className="sidebar__link-icon">
                    <HistoryIcon size={22} />
                  </span>
                  <span className="sidebar__link-label">All history</span>
                </NavLink>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </nav>
  )
}