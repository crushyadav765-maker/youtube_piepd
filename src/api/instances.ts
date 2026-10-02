import type { ProviderId } from './types'

export interface Instance {
  id: string
  label: string
  apiUrl: string
  provider: ProviderId
}

export const PIPED_INSTANCES: Instance[] = [
  { id: 'private-coffee', label: 'private.coffee', apiUrl: 'https://api.piped.private.coffee', provider: 'piped' },
  { id: 'kavin', label: 'kavin.rocks (official)', apiUrl: 'https://pipedapi.kavin.rocks', provider: 'piped' },
  { id: 'leptons', label: 'leptons.xyz', apiUrl: 'https://pipedapi.leptons.xyz', provider: 'piped' },
  { id: 'ducks', label: 'ducks.party', apiUrl: 'https://pipedapi.ducks.party', provider: 'piped' },
  { id: 'adminforge', label: 'adminforge.de', apiUrl: 'https://pipedapi.adminforge.de', provider: 'piped' },
  { id: 'privacy', label: 'privacy.com.de', apiUrl: 'https://piped-api.privacy.com.de', provider: 'piped' },
  { id: 'codespace', label: 'codespace.cz', apiUrl: 'https://piped-api.codespace.cz', provider: 'piped' },
  { id: 'kavin-libre', label: 'kavin.rocks libre', apiUrl: 'https://pipedapi-libre.kavin.rocks', provider: 'piped' },
  { id: 'drgns', label: 'drgns.space', apiUrl: 'https://pipedapi.drgns.space', provider: 'piped' },
  { id: 'owo', label: 'owo.si', apiUrl: 'https://pipedapi.owo.si', provider: 'piped' },
]

export const INVIDIOUS_INSTANCES: Instance[] = [
  { id: 'f5', label: 'invidious.f5.si', apiUrl: 'https://invidious.f5.si', provider: 'invidious' },
  { id: 'yewtu', label: 'yewtu.be', apiUrl: 'https://yewtu.be', provider: 'invidious' },
  { id: 'nerdvpn', label: 'invidious.nerdvpn.de', apiUrl: 'https://invidious.nerdvpn.de', provider: 'invidious' },
  { id: 'protokolla', label: 'invidious.protokolla.fi', apiUrl: 'https://invidious.protokolla.fi', provider: 'invidious' },
  { id: 'nerdvpn-eu', label: 'invidious.einfachzocken.eu', apiUrl: 'https://invidious.einfachzocken.eu', provider: 'invidious' },
  { id: 'materialio', label: 'invidious.materialio.us', apiUrl: 'https://invidious.materialio.us', provider: 'invidious' },
  { id: 'invidious-io', label: 'invidious.io', apiUrl: 'https://invidious.io', provider: 'invidious' },
]

export const ALL_INSTANCES: Instance[] = [...PIPED_INSTANCES, ...INVIDIOUS_INSTANCES]

export const DEFAULT_PIPED_INSTANCE = PIPED_INSTANCES[0]
export const DEFAULT_INVIDIOUS_INSTANCE = INVIDIOUS_INSTANCES[0]

const CUSTOM_KEY = 'pipedclone.custom.instances'

export function getCustomInstances(): Instance[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Instance[]) : []
  } catch {
    return []
  }
}

export function saveCustomInstances(instances: Instance[]): void {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(instances))
}

export function makeCustomId(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0
  }
  return `custom-${hash.toString(36)}`
}

export function guessProvider(url: string): 'piped' | 'invidious' {
  return /invidious|yewtu/i.test(url) ? 'invidious' : 'piped'
}

export function findInstance(id: string): Instance | undefined {
  return [...ALL_INSTANCES, ...getCustomInstances()].find((i) => i.id === id)
}