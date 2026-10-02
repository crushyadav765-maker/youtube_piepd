import { useState } from 'react'
import { AlertIcon, ChevronDownIcon, InfoIcon } from './icons'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function VideoCardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="skeleton--thumb" />
      <div className="card__body">
        <Skeleton className="skeleton--avatar" />
        <div className="card__meta">
          <Skeleton className="skeleton--line" />
          <Skeleton className="skeleton--line" />
          <Skeleton className="skeleton--line-short" />
        </div>
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: count }, (_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid--list">
      {Array.from({ length: count }, (_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  hint,
  onRetry,
}: {
  title?: string
  message: string
  hint?: string
  onRetry?: () => void
}) {
  return (
    <div className="state">
      <span className="state__icon">
        <AlertIcon size={44} />
      </span>
      <h2 className="state__title">{title}</h2>
      <p className="state__message">{message}</p>
      {hint ? <code className="state__hint">{hint}</code> : null}
      {onRetry ? (
        <button type="button" className="button button--primary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ title, message, icon }: { title: string; message: string; icon?: React.ReactNode }) {
  return (
    <div className="state">
      <span className="state__icon">{icon ?? <InfoIcon size={40} />}</span>
      <h2 className="state__title">{title}</h2>
      <p className="state__message">{message}</p>
    </div>
  )
}

export function Banner({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warn' }) {
  return (
    <div className={`banner${variant === 'warn' ? ' banner--warn' : ''}`}>
      <span className="banner__icon">
        {variant === 'warn' ? <AlertIcon size={18} /> : <InfoIcon size={18} />}
      </span>
      <div>{children}</div>
    </div>
  )
}

export interface MenuItem {
  key: string
  label: string
  sublabel?: string
  active?: boolean
  disabled?: boolean
  onSelect: () => void
}

export function Menu({
  trigger,
  items,
  header,
  align = 'right',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode
  items: MenuItem[]
  header?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="menu-anchor">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <>
          <div
            className="sidebar__scrim"
            style={{ zIndex: 75 }}
            onClick={() => setOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            role="presentation"
          />
          <div className={`menu${align === 'left' ? ' menu--left' : ''}`} role="menu">
            {header ? <div className="menu__header">{header}</div> : null}
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={`menu__item${item.active ? ' menu__item--active' : ''}`}
                disabled={item.disabled}
                style={item.disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
              >
                <span className="menu__item-body">
                  <span className="menu__item-title">{item.label}</span>
                  {item.sublabel ? <span className="menu__item-sub">{item.sublabel}</span> : null}
                </span>
                {item.active ? <ChevronDownIcon size={16} className="rotate-270" /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? ' switch--on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="switch__thumb" />
    </button>
  )
}