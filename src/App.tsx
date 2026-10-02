import { useCallback, useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { useDocumentTitle } from './hooks/useDocumentTitle'
import { HomePage, TrendingPage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import { WatchPage } from './pages/WatchPage'
import { ChannelPage } from './pages/ChannelPage'
import { PlaylistPage } from './pages/PlaylistPage'
import { SettingsPage } from './pages/SettingsPage'
import { HistoryPage } from './pages/HistoryPage'
import { NotFoundPage } from './pages/NotFoundPage'

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
}

export default function App() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile())
  const isSearchRoute = location.pathname === '/results'
  useDocumentTitle()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const closeSidebar = useCallback(() => {
    if (isMobile()) setSidebarOpen(false)
  }, [])

  return (
    <div className="app">
      <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      {isSearchRoute && isMobile() ? (
        <div style={{ padding: '0 16px 12px' }}>
          <SearchBar initialValue={new URLSearchParams(location.search).get('q') ?? ''} autoFocus />
        </div>
      ) : null}

      <div className="app__body">
        <Sidebar open={sidebarOpen} onNavigate={closeSidebar} />
        {sidebarOpen && isMobile() ? (
          <div className="sidebar__scrim" onClick={closeSidebar} role="presentation" />
        ) : null}

        <main className="app__main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/results" element={<SearchPage />} />
            <Route path="/watch" element={<WatchPage />} />
            <Route path="/channel/:channelId" element={<ChannelPage />} />
            <Route path="/playlist" element={<PlaylistPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>

          <footer className="footer">
            <p>
              PipeTube — a YouTube front-end built on the <span>Piped</span> and{' '}
              <span>Invidious</span> APIs. No accounts, no tracking, no ads.
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}