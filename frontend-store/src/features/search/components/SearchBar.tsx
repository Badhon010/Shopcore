import { useRef, useState, useEffect, useCallback } from 'react'
import { Search, X, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { ROUTES, buildRoute } from '@/constants/routes'
import { useSearchSuggestions } from '@/features/search/hooks/useSearch'

interface SearchBarProps {
  className?: string
  placeholder?: string
  defaultValue?: string
  onChange?: (value: string) => void
}

export function SearchBar({
  className,
  placeholder = 'Search products…',
  defaultValue = '',
  onChange,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep value in sync when defaultValue changes (e.g. URL navigation)
  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  const { data: suggestions } = useSearchSuggestions(value)
  const items = suggestions?.results ?? []
  const showDropdown = open && value.trim().length >= 2 && items.length > 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    onChange?.(v)
    setOpen(true)
    setActiveIndex(-1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    if (q) {
      setOpen(false)
      navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(q)}`)
    }
  }

  const handleSuggestionClick = (product: { name: string; slug: string }) => {
    setValue(product.name)
    onChange?.(product.name)
    setOpen(false)
    navigate(buildRoute.product(product.slug))
  }

  const handleClear = () => {
    setValue('')
    onChange?.('')
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      const item = items[activeIndex]
      if (item) handleSuggestionClick(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  // Close on outside click
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setOpen(false)
      setActiveIndex(-1)
    }
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)} onBlur={handleBlur}>
      <form role="search" onSubmit={handleSubmit} className="relative flex items-center">
        <label htmlFor="search-input" className="sr-only">
          Search products
        </label>
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-text-tertiary"
          aria-hidden
        />
        <input
          ref={inputRef}
          id="search-input"
          type="search"
          value={value}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={showDropdown ? 'search-suggestions' : undefined}
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
          className={cn(
            'h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-9 text-body-sm text-text-primary',
            'placeholder:text-text-tertiary',
            'transition-colors',
            'focus-visible:outline-none focus-visible:shadow-focus-ring focus-visible:border-accent',
            showDropdown && 'rounded-b-none border-b-transparent'
          )}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={handleClear}
            className="absolute right-2 rounded p-1 text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <ul
          id="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 z-50 overflow-hidden rounded-b-lg border border-t-0 border-accent bg-surface shadow-lg"
        >
          {items.map((product, i) => (
            <li
              key={product.id}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSuggestionClick(product)
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-3 py-2.5 text-body-sm transition-colors',
                i === activeIndex
                  ? 'bg-accent/8 text-accent'
                  : 'text-text-primary hover:bg-bg-subtle'
              )}
            >
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
              <span className="truncate">{product.name}</span>
              {product.category && (
                <span className="ml-auto shrink-0 text-caption text-text-tertiary">
                  {product.category.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
