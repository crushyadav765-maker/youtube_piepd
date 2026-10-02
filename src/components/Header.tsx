import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SearchBar } from './SearchBar'
import { CloseIcon, LogoIcon, MenuIcon, MoonIcon, SearchIcon, SettingsIcon, SunIcon } from './icons'
import { useSettings } from '../state/settingsContext'

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const { update, resolvedTheme } = useSettings()
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isSearch = location.pathname === '/results'

  const toggleTheme = () => {
    update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })
  }

  return (
    <header className={`header${scrolled ? ' header--scrolled' : ''}`}>
      <div className="header__left">
        <button
          type="button"
          className="icon-button header__menu"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>
        <Link to="/" className="header__logo" aria-label="PipeTube home">
          <LogoIcon size={26} className="header__logo-mark" />
          <span className="header__logo-text">PipeTube</span>
        </Link>
      </div>

      <div className="header__center">
        {isSearch ? <SearchBar initialValue={new URLSearchParams(location.search).get('q') ?? ''} autoFocus /> : null}
      </div>

      <div className="header__right">
        {!isSearch ? (
          <Link to="/results" className="icon-button" aria-label="Search">
            <SearchIcon size={22} />
          </Link>
        ) : null}
        <button
          type="button"
          className="icon-button"
          aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
        >
          {resolvedTheme === 'dark' ? <SunIcon size={22} /> : <MoonIcon size={22} />}
        </button>
        <Link
          to="/settings"
          className={`icon-button${location.pathname === '/settings' ? ' icon-button--active' : ''}`}
          aria-label="Settings"
        >
          <SettingsIcon size={22} />
        </Link>
        </div>
    </header>
  )
}