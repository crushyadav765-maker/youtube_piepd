import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounced } from '../hooks/useAsync'
import { useSettings } from '../state/settingsContext'
import { CloseIcon, SearchIcon } from './icons'

export function SearchBar({ initialValue = '', autoFocus = false }: { initialValue?: string; autoFocus?: boolean }) {
  const [value, setValue] = useState(initialValue)
  const [syncedValue, setSyncedValue] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const navigate = useNavigate()
  const { call } = useSettings()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounced(value.trim(), 220)

  // Adjust state during render when the parent changes the query.
  if (initialValue !== syncedValue) {
    setSyncedValue(initialValue)
    setValue(initialValue)
  }

  useEffect(() => {
    if (debounced.length < 2) return
    let active = true
    call((api) => api.suggestions(debounced))
      .then((result) => {
        if (active) setSuggestions(result.slice(0, 10))
      })
      .catch(() => {
        if (active) setSuggestions([])
      })
    return () => {
      active = false
    }
  }, [debounced, call])

  const visibleSuggestions = debounced.length < 2 ? [] : suggestions

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const submit = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
    navigate(`/results?q=${encodeURIComponent(trimmed)}`)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!open || visibleSuggestions.length === 0) {
      if (event.key === 'Enter') submit(value)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % visibleSuggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i <= 0 ? visibleSuggestions.length - 1 : i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      submit(activeIndex >= 0 ? visibleSuggestions[activeIndex] : value)
    }
  }

  return (
    <div className="search" ref={containerRef}>
      <input
        ref={inputRef}
        className="search__input"
        type="search"
        value={value}
        placeholder="Search videos"
        aria-label="Search videos"
        autoComplete="off"
        autoFocus={autoFocus}
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {value ? (
        <button
          type="button"
          className="search__clear"
          aria-label="Clear search"
          onClick={() => {
            setValue('')
            setSuggestions([])
            inputRef.current?.focus()
          }}
        >
          <CloseIcon size={16} />
        </button>
      ) : null}
      <button type="button" className="search__submit" aria-label="Search" onClick={() => submit(value)}>
        <SearchIcon size={20} />
      </button>

      {open && visibleSuggestions.length > 0 ? (
        <div className="suggestions" role="listbox">
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`suggestions__item${index === activeIndex ? ' suggestions__item--active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => submit(suggestion)}
            >
              <SearchIcon size={16} className="suggestions__icon" />
              <span className="suggestions__label">{suggestion}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}