export class HttpError extends Error {
  status: number
  url: string

  constructor(status: number, url: string, message?: string) {
    super(message ?? `Request failed with status ${status}`)
    this.name = 'HttpError'
    this.status = status
    this.url = url
  }
}

export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
  headers?: Record<string, string>
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { signal, timeoutMs = 20000, headers } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...headers },
    })

    if (!response.ok) {
      throw new HttpError(response.status, url)
    }

    const text = await response.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const message = error instanceof Error ? error.message : String(error)
    throw new HttpError(0, url, message)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}