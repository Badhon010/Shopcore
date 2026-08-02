import { useState, useEffect, useRef, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Package, Hash, Tag, History, CornerDownLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@/services/api/axiosClient'
import { endpoints } from '@/services/api/endpoints'
import { useDebounce } from '@/utils/useDebounce'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'
import { NAV_GROUPS } from '@/constants/navigation'
import type { LucideIcon } from 'lucide-react'

interface SearchResult {
  products?: Array<{ name: string; slug: string }>
  categories?: Array<{ name: string; slug: string }>
  brands?: Array<{ name: string; slug: string }>
}

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

interface PaletteItem {
  id: string
  label: string
  sublabel?: string
  icon: LucideIcon
  section: string
  /** Action taken when the item is selected. */
  run: () => void
}

const RECENT_KEY = 'shopcore-admin-recent-searches'
const MAX_RECENTS = 6

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENTS) : []
  } catch {
    return []
  }
}

function saveRecents(recents: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(recents)) } catch { /* ignore */ }
}

function pushRecent(query: string) {
  const q = query.trim()
  if (!q) return
  saveRecents([q, ...loadRecents().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENTS))
}

/** All navigation commands, grouped by their sidebar section. */
function buildNavCommands(): PaletteItem[] {
  const commands: PaletteItem[] = []
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      commands.push({
        id: `nav-${item.href}`,
        label: item.label,
        sublabel: group.label,
        icon: item.icon,
        section: 'Navigate',
        run: () => undefined,
      })
    }
  }
  return commands
}

const FOCUSABLE_SELECTOR = 'button, input, [href], [tabindex]:not([tabindex="-1"])'

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recents, setRecents] = useState<string[]>(loadRecents)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 250)
  const isSearching = debouncedQuery.trim().length >= 2

  const { data, isFetching } = useQuery<SearchResult>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return {}
      const res = await axiosClient.get<SearchResult>(endpoints.search.global(), {
        params: { q: debouncedQuery },
      })
      return res.data
    },
    enabled: isSearching,
    staleTime: 30_000,
  })

  // Reset state whenever the palette opens, then focus the input.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(t)
  }, [open])

  // Global key handling while open: Escape closes, Tab is trapped in the panel,
  // and the arrow keys navigate the list no matter which element has focus.
  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (!focusables?.length) return
        const first = focusables[0]!
        const last = focusables[focusables.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Keep the active item in view while keyboard-navigating.
  useEffect(() => {
    if (!open) return
    const active = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  // Build the flat palette item list (search results OR commands + recents).
  const paletteItems: PaletteItem[] = useMemo(() => {
    if (isSearching) {
      const items: PaletteItem[] = []
      for (const product of data?.products ?? []) {
        items.push({
          id: `product-${product.slug}`, label: product.name, sublabel: 'Product',
          icon: Package, section: 'Products',
          run: () => { pushRecent(debouncedQuery); setRecents(loadRecents()); navigate(ROUTES.PRODUCT_DETAIL(product.slug)); onClose() },
        })
      }
      for (const category of data?.categories ?? []) {
        items.push({
          id: `category-${category.slug}`, label: category.name, sublabel: 'Category',
          icon: Hash, section: 'Categories',
          run: () => { pushRecent(debouncedQuery); setRecents(loadRecents()); navigate(ROUTES.CATEGORIES); onClose() },
        })
      }
      for (const brand of data?.brands ?? []) {
        items.push({
          id: `brand-${brand.slug}`, label: brand.name, sublabel: 'Brand',
          icon: Tag, section: 'Brands',
          run: () => { pushRecent(debouncedQuery); setRecents(loadRecents()); navigate(ROUTES.BRANDS); onClose() },
        })
      }
      return items
    }

    const commands = buildNavCommands().map((c) => ({
      ...c,
      run: () => { navigate(c.id.replace('nav-', '')); onClose() },
    }))

    const recentItems: PaletteItem[] = recents.map((term, i) => ({
      id: `recent-${i}`,
      label: term,
      sublabel: 'Recent search',
      icon: History,
      section: 'Recent',
      run: () => { setQuery(term); setActiveIndex(0); inputRef.current?.focus() },
    }))
    return [...commands, ...recentItems]
  }, [isSearching, data, recents, debouncedQuery, navigate, onClose])

  // Group items by section for rendering (preserving flat order).
  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>()
    for (const item of paletteItems) {
      const arr = map.get(item.section) ?? []
      arr.push(item)
      map.set(item.section, arr)
    }
    return Array.from(map.entries())
  }, [paletteItems])

  // Flat index lookup: section offsets + local index → global index.
  const indexMap = useMemo(() => {
    const map = new Map<string, number[]>()
    let cursor = 0
    for (const [section, items] of grouped) {
      map.set(section, items.map((_, i) => cursor + i))
      cursor += items.length
    }
    return map
  }, [grouped])

  function moveActive(delta: number) {
    setActiveIndex((i) => {
      const next = Math.min(Math.max(i + delta, 0), paletteItems.length - 1)
      return paletteItems.length === 0 ? 0 : next
    })
  }

  function handleKeyDown(e: ReactKeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveActive(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = paletteItems[activeIndex]
      if (item) item.run()
    }
  }

  if (!open) return null

  const showRecentFooter = !isSearching && recents.length > 0

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Backdrop — a real button so it is keyboard-accessible and closes on click */}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-overlay/50 backdrop-blur-sm focus-visible:outline-none"
      />

      {/* Panel — no hard outline; shadow alone separates it from the backdrop */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-xl animate-scale-in overflow-hidden rounded-xl bg-surface shadow-lg"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search or jump to…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-none focus:shadow-none focus-visible:shadow-none"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-autocomplete="list"
          />
          {isFetching && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-r-transparent" aria-hidden />}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="search-results"
          role="listbox"
          aria-label="Search results"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="max-h-[380px] overflow-y-auto py-2 focus-visible:outline-none"
        >
          {isSearching && paletteItems.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-text-muted">
              {isFetching ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-r-transparent" aria-hidden />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden />
                  No results for “{debouncedQuery}”
                </>
              )}
            </div>
          ) : (
            grouped.map(([section, items]) => (
              <div key={section}>
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  {section}
                </p>
                {items.map((item, localIdx) => {
                  const globalIdx = indexMap.get(section)?.[localIdx] ?? 0
                  const Icon = item.icon
                  const isActive = globalIdx === activeIndex
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-index={globalIdx}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                      onFocus={() => setActiveIndex(globalIdx)}
                      onClick={() => item.run()}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isActive ? 'bg-bg-subtle' : 'hover:bg-bg-subtle/50',
                        'focus-visible:outline-none focus-visible:shadow-focus-ring'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{item.label}</p>
                        {item.sublabel && <p className="truncate text-xs text-text-muted">{item.sublabel}</p>}
                      </div>
                      {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Recent searches footer */}
        {showRecentFooter && (
          <div className="flex items-center justify-between border-t border-border-light px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Recent searches</p>
            <button
              onClick={() => { saveRecents([]); setRecents([]) }}
              className="text-xs font-medium text-text-muted transition-colors hover:text-danger focus-visible:outline-none focus-visible:shadow-focus-ring"
            >
              Clear history
            </button>
          </div>
        )}

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border-light px-4 py-2">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border px-1 font-mono text-[10px]">↑↓</kbd> navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border px-1 font-mono text-[10px]">↵</kbd> select
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border px-1 font-mono text-[10px]">Esc</kbd> close
            </span>
          </div>
          <span className="hidden items-center gap-1 text-[10px] text-text-muted sm:inline-flex">
            <kbd className="rounded border border-border px-1 font-mono">Ctrl</kbd>
            <kbd className="rounded border border-border px-1 font-mono">K</kbd>
            <span className="ml-0.5">open</span>
          </span>
        </div>
      </div>
    </div>
  )
}
