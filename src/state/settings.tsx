import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { findInstance } from '../api/instances'
import { withFailover } from '../api'
import type { ProviderApi } from '../api/types'
import {
  DEFAULT_SETTINGS,
  SettingsContext,
  type HistoryEntry,
  type Settings,
  type SettingsContextValue,
} from './settingsContext'

const STORAGE_KEY = 'pipedclone.settings.v1'
const HISTORY_KEY = 'pipedclone.history.v1'
const HISTORY_LIMIT = 60

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    const merged = { ...DEFAULT_SETTINGS, ...parsed }
    if (!findInstance(merged.instanceId)) merged.instanceId = DEFAULT_SETTINGS.instanceId
    return merged
  } catch {
    return DEFAULT_SETTINGS
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [failedInstances, setFailedInstances] = useState<string[]>([])
  const [lastUsedInstance, setLastUsedInstance] = useState<string | null>(null)
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (settings.saveHistory) localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    else localStorage.removeItem(HISTORY_KEY)
  }, [history, settings.saveHistory])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const resolvedTheme: 'dark' | 'light' =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const call = useCallback(
    async <T,>(operation: (api: ProviderApi) => Promise<T>): Promise<T> => {
      const result = await withFailover(settings.instanceId, operation, settings.provider)
      setLastUsedInstance(result.usedInstance)
      setFailedInstances(result.failedInstances)
      return result.value
    },
    [settings.instanceId, settings.provider],
  )

  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'watchedAt'>) => {
    setHistory((prev) => [
      { ...entry, watchedAt: Date.now() },
      ...prev.filter((item) => item.id !== entry.id),
    ].slice(0, HISTORY_LIMIT))
  }, [])

  const clearHistory = useCallback(() => setHistory([]), [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      update,
      reset,
      resolvedTheme,
      call,
      lastUsedInstance,
      failedInstances,
      history,
      addToHistory,
      clearHistory,
    }),
    [settings, update, reset, resolvedTheme, call, lastUsedInstance, failedInstances, history, addToHistory, clearHistory],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}