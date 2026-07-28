import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Package, ShoppingCart, Users, Hash } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@/services/api/axiosClient'
import { endpoints } from '@/services/api/endpoints'
import { useDebounce } from '@/utils/useDebounce'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'

interface SearchResult {
  products?: Array<{ name: string; slug: string }>
  categories?: Array<{ name: string; slug: string }>
  brands?: Array<{ name: string; slug: string }>
}

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 300)

  const { data, isFetching } = useQuery<SearchResult>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return {}
      const res = await axiosClient.get<SearchResult>(endpoints.search.global(), {
        params: { q: debouncedQuery },
      })
      return res.data
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  })

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  // Build flat list of results for keyboard nav
  const results: Array<{ label: string; sublabel: string; icon: typeof Package; href: string }> = []
  data?.products?.forEach((p) => results.push({
    label: p.name, sublabel: 'Product',
    icon: Package, href: ROUTES.PRODUCT_DETAIL(p.slug),
  }))
  data?.categories?.forEach((c) => results.push({
    label: c.name, sublabel: 'Category',
    icon: Hash, href: ROUTES.CATEGORIES,
  }))

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      navigate(results[activeIndex]!.href)
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Global search"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-overlay/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-xl animate-scale-in overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search products, orders, customers…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            aria-label="Search"
          />
          {isFetching && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-r-transparent" />}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="max-h-[380px] overflow-y-auto py-2">
            {results.length === 0 && !isFetching ? (
              <div className="flex items-center gap-3 px-4 py-8 text-center">
                <p className="w-full text-sm text-text-muted">No results for "{query}"</p>
              </div>
            ) : (
              results.map((r, i) => {
                const Icon = r.icon
                return (
                  <button
                    key={i}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === activeIndex ? 'bg-bg-subtle' : 'hover:bg-bg-subtle/50'
                    )}
                    onClick={() => { navigate(r.href); onClose() }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{r.label}</p>
                      <p className="text-xs text-text-muted">{r.sublabel}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="px-4 py-5">
            <p className="text-xs text-text-muted">
              Type at least 2 characters to search
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: 'Products', icon: Package, href: ROUTES.PRODUCTS },
                { label: 'Orders', icon: ShoppingCart, href: ROUTES.ORDERS },
                { label: 'Customers', icon: Users, href: ROUTES.CUSTOMERS },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => { navigate(item.href); onClose() }}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-secondary"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="border-t border-border-light px-4 py-2">
          <p className="text-xs text-text-muted">
            <kbd className="rounded border border-border px-1 font-mono">↑↓</kbd> navigate
            {' · '}
            <kbd className="rounded border border-border px-1 font-mono">↵</kbd> select
            {' · '}
            <kbd className="rounded border border-border px-1 font-mono">Esc</kbd> close
          </p>
        </div>
      </div>
    </div>
  )
}
