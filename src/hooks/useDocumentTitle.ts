import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'PipeTube — Home'],
  [/^\/trending/, 'Trending — PipeTube'],
  [/^\/results/, 'Search — PipeTube'],
  [/^\/watch/, 'Watch — PipeTube'],
  [/^\/channel/, 'Channel — PipeTube'],
  [/^\/playlist/, 'Playlist — PipeTube'],
  [/^\/history/, 'History — PipeTube'],
  [/^\/settings/, 'Settings — PipeTube'],
]

export function useDocumentTitle(): void {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'PipeTube'
    document.documentElement.lang = 'en'
  }, [pathname])
}