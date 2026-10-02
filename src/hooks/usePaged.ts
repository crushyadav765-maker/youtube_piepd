import { useCallback, useEffect, useRef, useState } from 'react'
import type { Paged } from '../api/types'

export interface PagedState<T> {
  items: T[]
  loading: boolean
  loadingMore: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  reload: () => void
}

/**
 * Drives a cursor-paginated list. `fetchPage` receives the continuation token
 * for the requested page (null for the first one).
 */
export function usePaged<T>(
  fetchPage: (continuation: string | null) => Promise<Paged<T>>,
  deps: unknown[],
): PagedState<T> {
  const [items, setItems] = useState<T[]>([])
  const [continuation, setContinuation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)

  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage
  const inFlight = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    inFlight.current = false

    fetchRef
      .current(null)
      .then((page) => {
        if (!active) return
        setItems(page.items)
        setContinuation(page.continuation)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !continuation || inFlight.current) return
    inFlight.current = true
    setLoadingMore(true)

    fetchRef
      .current(continuation)
      .then((page) => {
        setItems((prev) => {
          const seen = new Set(prev.map((item) => JSON.stringify(item)))
          return [...prev, ...page.items.filter((item) => !seen.has(JSON.stringify(item)))]
        })
        setContinuation(page.continuation)
      })
      .catch(() => undefined)
      .finally(() => {
        inFlight.current = false
        setLoadingMore(false)
      })
  }, [continuation, loading, loadingMore])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: Boolean(continuation),
    loadMore,
    reload,
  }
}