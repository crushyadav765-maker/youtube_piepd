import { createContext, useContext } from 'react'
import type { ProviderApi, ProviderPreference } from '../api/types'

export type ThemeMode = 'dark' | 'light' | 'system'
export type WatchLayout = 'grid' | 'list'
export type { ProviderPreference }

export interface Settings {
  theme: ThemeMode
  instanceId: string
  provider: ProviderPreference
  autoplay: boolean
  autoplayNext: boolean
  watchLayout: WatchLayout
  region: string
  saveHistory: boolean
  defaultQuality: string
}

export interface HistoryEntry {
  id: string
  title: string
  thumbnail: string
  uploaderName: string
  watchedAt: number
}

export interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
  resolvedTheme: 'dark' | 'light'
  call: <T>(operation: (api: ProviderApi) => Promise<T>) => Promise<T>
  lastUsedInstance: string | null
  failedInstances: string[]
  history: HistoryEntry[]
  addToHistory: (entry: Omit<HistoryEntry, 'watchedAt'>) => void
  clearHistory: () => void
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  instanceId: 'private-coffee',
  provider: 'auto',
  autoplay: true,
  autoplayNext: true,
  watchLayout: 'grid',
  region: 'US',
  saveHistory: true,
  defaultQuality: 'auto',
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>')
  return context
}