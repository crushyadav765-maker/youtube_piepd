import { HttpError } from './http'
import { ALL_INSTANCES, findInstance, getCustomInstances } from './instances'
import type { Instance } from './instances'
import { InvidiousApi } from './invidious'
import { PipedApi } from './piped'
import type { ProviderApi, ProviderId, ProviderPreference } from './types'

const factories: Record<ProviderId, (instance: Instance) => ProviderApi> = {
  piped: (instance) => new PipedApi({ label: instance.label, apiUrl: instance.apiUrl }),
  invidious: (instance) => new InvidiousApi(instance.apiUrl),
}

export function createProvider(instanceId: string): ProviderApi | null {
  const instance = findInstance(instanceId)
  if (!instance) return null
  return factories[instance.provider](instance)
}

/**
 * Primary instance first, then the other provider, then same-provider siblings.
 * Public instances of one provider share upstream breakage, so trying a healthy
 * instance from the other provider beats walking a long list of dead siblings.
 * A `provider` preference narrows the chain to instances of that provider only.
 */
export function fallbackChain(instanceId: string, provider: ProviderPreference = 'auto'): Instance[] {
  const primary = findInstance(instanceId)
  const all = [...ALL_INSTANCES, ...getCustomInstances()]
  if (provider !== 'auto') {
    return primary?.provider === provider
      ? [primary, ...all.filter((i) => i.provider === provider && i.id !== primary.id)]
      : all.filter((i) => i.provider === provider)
  }
  if (!primary) return all

  const otherProvider = all.filter((i) => i.provider !== primary.provider)
  const sameProvider = all.filter((i) => i.provider === primary.provider && i.id !== primary.id)

  return [primary, ...otherProvider, ...sameProvider]
}

export interface WithFailover<T> {
  value: T
  usedInstance: string
  usedProvider: ProviderId
  failedInstances: string[]
}

/**
 * Runs `operation` against the primary instance, walking the fallback chain on
 * transport-level failures. Client errors (404 and friends) abort immediately.
 */
export async function withFailover<T>(
  instanceId: string,
  operation: (api: ProviderApi) => Promise<T>,
  provider: ProviderPreference = 'auto',
): Promise<WithFailover<T>> {
  const chain = fallbackChain(instanceId, provider)
  const failedInstances: string[] = []
  let lastError: unknown = null

  for (let index = 0; index < chain.length; index += 1) {
    const instance = chain[index]
    const api = factories[instance.provider](instance)
    try {
      const value = await operation(api)
      return { value, usedInstance: api.instance, usedProvider: api.id, failedInstances }
    } catch (error) {
      lastError = error
      // A 404 from the primary instance is authoritative: the content does not exist.
      // A 404 from a fallback instance only means that instance cannot serve it, so skip on.
      const retryable = isRetryable(error) || (index > 0 && isNotFound(error))
      if (!retryable) break
      failedInstances.push(instance.label)
    }
  }

  throw lastError instanceof Error ? lastError : new HttpError(0, '', 'No instance available')
}

function isNotFound(error: unknown): boolean {
  return error instanceof HttpError && error.status === 404
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status === 0 || error.status === 429 || error.status >= 500
  }
  return error instanceof TypeError
}