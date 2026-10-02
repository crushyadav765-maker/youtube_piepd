import { useState } from 'react'
import {
  INVIDIOUS_INSTANCES,
  PIPED_INSTANCES,
  getCustomInstances,
  guessProvider,
  makeCustomId,
  saveCustomInstances,
} from '../api/instances'
import type { Instance } from '../api/instances'
import { useSettings } from '../state/settingsContext'
import { Banner, Toggle } from '../components/ui'
import { AlertIcon, RefreshIcon } from '../components/icons'

const REGIONS = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IN', 'JP', 'BR', 'ES', 'IT', 'NL', 'SE', 'PL', 'MX']

type Status = 'unknown' | 'checking' | 'ok' | 'bad'

const QUALITIES = ['auto', '2160', '1440', '1080', '720', '480']

export function SettingsPage() {
  const { settings, update, reset, lastUsedInstance, failedInstances, history, clearHistory } = useSettings()
  const [customUrl, setCustomUrl] = useState('')
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [customs, setCustomsState] = useState<Instance[]>(() => getCustomInstances())

  const testInstance = async (instance: Instance) => {
    setStatuses((prev) => ({ ...prev, [instance.id]: 'checking' }))
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 8000)
    try {
      const path = instance.provider === 'piped' ? '/trending?region=US' : '/api/v1/stats'
      const response = await fetch(`${instance.apiUrl}${path}`, { signal: controller.signal })
      setStatuses((prev) => ({ ...prev, [instance.id]: response.ok ? 'ok' : 'bad' }))
    } catch {
      setStatuses((prev) => ({ ...prev, [instance.id]: 'bad' }))
    } finally {
      window.clearTimeout(timer)
    }
  }

  const testAll = async () => {
    for (const instance of [...PIPED_INSTANCES, ...INVIDIOUS_INSTANCES].slice(0, 8)) {
      await testInstance(instance)
    }
  }

  const useCustom = () => {
    const url = customUrl.trim().replace(/\/+$/, '')
    if (!/^https?:\/\//i.test(url)) return
    const instance: Instance = {
      id: makeCustomId(url),
      label: url.replace(/^https?:\/\//i, ''),
      apiUrl: url,
      provider: guessProvider(url),
    }
    const existing = getCustomInstances().filter((i) => i.apiUrl !== url)
    saveCustomInstances([...existing, instance])
    update({ instanceId: instance.id })
    setCustomUrl('')
    setCustomsState([...existing, instance])
  }

  const renderInstance = (instance: Instance) => {
    const status = statuses[instance.id] ?? 'unknown'
    const active = settings.instanceId === instance.id
    return (
      <div key={instance.id} className={`instance-row${active ? ' instance-row--active' : ''}`}>
        <div className="instance-row__body">
          <div className="instance-row__name">
            {instance.label}
            <span className={`badge badge--${instance.provider}`}>{instance.provider}</span>
            {active ? <span className="badge badge--ok">active</span> : null}
            {status === 'checking' ? <span className="dot dot--pulse" style={{ color: 'var(--text-muted)' }} /> : null}
            {status === 'ok' ? <span className="badge badge--ok">reachable</span> : null}
            {status === 'bad' ? <span className="badge badge--bad">unreachable</span> : null}
          </div>
          <div className="instance-row__url">{instance.apiUrl}</div>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => update({ instanceId: instance.id })}
          disabled={active}
        >
          {active ? 'In use' : 'Use'}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={`Test ${instance.label}`}
          onClick={() => void testInstance(instance)}
        >
          <RefreshIcon size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="container settings">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Everything is stored locally in your browser.</p>
        </div>
        <button type="button" className="button button--ghost" onClick={reset}>
          Reset to defaults
        </button>
      </div>

      {lastUsedInstance ? (
        <Banner>
          Last successful request was served by <code>{lastUsedInstance}</code>.
          {failedInstances.length > 0
            ? ` Failed instances: ${failedInstances.join(', ')}.`
            : ' No fallback was needed.'}
        </Banner>
      ) : null}

      {failedInstances.length > 0 ? (
        <Banner variant="warn">
          <AlertIcon size={16} /> Most public Piped instances are shut down. If videos do not load, switch to an
          Invidious instance below.
        </Banner>
      ) : null}

      <section className="settings__group">
        <h2 className="settings__group-title">Active instance</h2>
        <p className="settings__group-desc">
          Piped is the primary backend. If it is unreachable the app automatically retries against the other instances.
        </p>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Instance</p>
            <p className="field__hint">Changing this reloads all data on the next navigation.</p>
          </div>
          <div className="field__control">
            <select
              className="select"
              value={settings.instanceId}
              onChange={(e) => update({ instanceId: e.target.value })}
            >
              <optgroup label="Piped">
                {PIPED_INSTANCES.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Invidious">
                {INVIDIOUS_INSTANCES.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </optgroup>
              {customs.length > 0 ? (
                <optgroup label="Custom">
                  {customs.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
        </div>

        <div className="field">
          <div className="field__body">
            <p className="field__label">Preferred provider</p>
            <p className="field__hint">
              &ldquo;Auto&rdquo; follows the selected instance. Forcing a provider overrides the instance picker.
            </p>
          </div>
          <div className="field__control">
            <select
              className="select"
              value={settings.provider}
              onChange={(e) => update({ provider: e.target.value as typeof settings.provider })}
            >
              <option value="auto">Auto (use instance)</option>
              <option value="piped">Always Piped</option>
              <option value="invidious">Always Invidious</option>
            </select>
          </div>
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__group-title">Custom instance</h2>
        <p className="settings__group-desc">
          Self-host <code>Piped-Backend</code> or <code>Invidious</code> and point the app at it.
        </p>
        <div className="field">
          <div className="field__body">
            <p className="field__label">API base URL</p>
            <p className="field__hint">Include the scheme, e.g. https://pipedapi.example.org</p>
          </div>
          <div className="field__control" style={{ display: 'flex', gap: 8 }}>
            <input
              className="text-input text-input--mono"
              placeholder="https://pipedapi.example.org"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            <button
              type="button"
              className="button button--primary"
              disabled={!/^https?:\/\//i.test(customUrl.trim())}
              onClick={useCustom}
            >
              Add
            </button>
          </div>
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__group-title">Available instances</h2>
        <p className="settings__group-desc">
          Test an instance to check whether it is still online before switching.
        </p>
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="button" onClick={() => void testAll()}>
            <RefreshIcon size={16} />
            Test all
          </button>
        </div>

        <h3 className="settings__group-title" style={{ fontSize: 14, marginTop: 20 }}>
          Piped
        </h3>
        {PIPED_INSTANCES.map(renderInstance)}

        <h3 className="settings__group-title" style={{ fontSize: 14, marginTop: 20 }}>
          Invidious
        </h3>
        {INVIDIOUS_INSTANCES.map(renderInstance)}

        {customs.length > 0 ? (
          <>
            <h3 className="settings__group-title" style={{ fontSize: 14, marginTop: 20 }}>
              Custom
            </h3>
            {customs.map(renderInstance)}
          </>
        ) : null}
      </section>

      <section className="settings__group">
        <h2 className="settings__group-title">Playback</h2>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Autoplay</p>
            <p className="field__hint">Start playback as soon as a video page loads.</p>
          </div>
          <div className="field__control">
            <Toggle on={settings.autoplay} onChange={(v) => update({ autoplay: v })} label="Autoplay" />
          </div>
        </div>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Autoplay next video</p>
            <p className="field__hint">Play a related video when the current one ends.</p>
          </div>
          <div className="field__control">
            <Toggle
              on={settings.autoplayNext}
              onChange={(v) => update({ autoplayNext: v })}
              label="Autoplay next video"
            />
          </div>
        </div>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Preferred quality</p>
            <p className="field__hint">The player picks the closest available resolution.</p>
          </div>
          <div className="field__control">
            <select
              className="select"
              value={settings.defaultQuality}
              onChange={(e) => update({ defaultQuality: e.target.value })}
            >
              {QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {q === 'auto' ? 'Auto (max 1080p)' : `${q}p`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="settings__group">
        <h2 className="settings__group-title">Appearance & data</h2>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Theme</p>
          </div>
          <div className="field__control">
            <select
              className="select"
              value={settings.theme}
              onChange={(e) => update({ theme: e.target.value as typeof settings.theme })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Default layout</p>
          </div>
          <div className="field__control">
            <select
              className="select"
              value={settings.watchLayout}
              onChange={(e) => update({ watchLayout: e.target.value as typeof settings.watchLayout })}
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </div>
        </div>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Trending region</p>
          </div>
          <div className="field__control">
            <select
              className="select"
              value={settings.region}
              onChange={(e) => update({ region: e.target.value })}
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Save watch history</p>
            <p className="field__hint">Stored in localStorage on this device only.</p>
          </div>
          <div className="field__control">
            <Toggle
              on={settings.saveHistory}
              onChange={(v) => update({ saveHistory: v })}
              label="Save watch history"
            />
          </div>
        </div>
        <div className="field">
          <div className="field__body">
            <p className="field__label">Clear history</p>
            <p className="field__hint">{history.length} entries stored.</p>
          </div>
          <div className="field__control">
            <button
              type="button"
              className="button button--danger"
              onClick={clearHistory}
              disabled={history.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}