import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, Star, Search, Tag } from 'lucide-react'
import { Slider } from '@/components/ui/Slider'
import { cn } from '@/utils/cn'
import { useCategoryTree, useBrands } from '@/features/catalog/hooks/useProducts'
import type { Category } from '@/types/models'

/* ── Types ──────────────────────────────────────────────────── */

export interface FilterState {
  priceRange: [number, number]
  inStockOnly: boolean
  minRating: number
  ordering: string
  brands: string[]
}

interface ProductFiltersProps {
  filters: FilterState
  onFiltersChange: (f: FilterState) => void
  onClear: () => void
  minPrice?: number
  maxPrice?: number
  priceLoading?: boolean
  selectedCategory?: string
  onCategorySelect?: (slug: string | undefined) => void
}

export const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, 0],
  inStockOnly: false,
  minRating: 0,
  ordering: '',
  brands: [],
}

export function makeDefaultFilters(minPrice: number, maxPrice: number): FilterState {
  return { ...DEFAULT_FILTERS, priceRange: [minPrice, maxPrice] }
}

/* ── Category tree ──────────────────────────────────────────── */

function CategoryTree({
  tree,
  selectedCategory,
  onCategorySelect,
}: {
  tree: Category[]
  selectedCategory?: string
  onCategorySelect: (slug: string | undefined) => void
}) {
  // Compute which parents should start expanded (parent of selected child)
  const getInitialExpanded = () => {
    const set = new Set<string>()
    tree.forEach((cat) => {
      if (cat.children?.some((c) => c.slug === selectedCategory)) set.add(cat.slug)
    })
    return set
  }
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(getInitialExpanded)

  // Auto-expand parent when selectedCategory changes to a child slug
  useEffect(() => {
    tree.forEach((cat) => {
      if (cat.children?.some((c) => c.slug === selectedCategory)) {
        setExpandedSlugs((prev) => (prev.has(cat.slug) ? prev : new Set([...prev, cat.slug])))
      }
    })
  }, [selectedCategory, tree])

  const toggleExpand = (slug: string) => {
    setExpandedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  return (
    <ul className="space-y-0.5">
      {/* All Products shortcut */}
      <li>
        <button
          type="button"
          onClick={() => onCategorySelect(undefined)}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-100',
            !selectedCategory
              ? 'bg-accent text-white font-medium'
              : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
          )}
        >
          All Products
        </button>
      </li>

      {tree.map((cat) => {
        const isActive = selectedCategory === cat.slug
        const hasChildren = (cat.children?.length ?? 0) > 0
        const isParentOfActive = hasChildren && cat.children!.some((c) => c.slug === selectedCategory)
        const isExpanded = expandedSlugs.has(cat.slug) || isParentOfActive

        return (
          <li key={cat.slug}>
            {/* Root category row */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onCategorySelect(isActive ? undefined : cat.slug)}
                className={cn(
                  'flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-100',
                  isActive || isParentOfActive
                    ? 'bg-accent text-white font-medium'
                    : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                )}
              >
                <span>{cat.name}</span>
                {cat.product_count !== undefined && (
                  <span
                    className={cn(
                      'ml-1 text-[11px]',
                      isActive || isParentOfActive ? 'text-white/70' : 'text-text-tertiary'
                    )}
                  >
                    {cat.product_count}
                  </span>
                )}
              </button>

              {/* Expand/collapse toggle (only when there are children) */}
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggleExpand(cat.slug)}
                  aria-label={isExpanded ? 'Collapse subcategories' : 'Expand subcategories'}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-text-primary"
                >
                  {isExpanded
                    ? <ChevronUp className="h-3 w-3" />
                    : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
              <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                {cat.children!.map((child) => {
                  const childActive = selectedCategory === child.slug
                  return (
                    <li key={child.slug}>
                      <button
                        type="button"
                        onClick={() => onCategorySelect(childActive ? undefined : child.slug)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[13px] transition-all duration-100',
                          childActive
                            ? 'bg-accent/10 text-accent font-medium'
                            : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                        )}
                      >
                        <span>{child.name}</span>
                        {child.product_count !== undefined && (
                          <span className={cn('ml-1 text-[11px]', childActive ? 'text-accent/60' : 'text-text-tertiary')}>
                            {child.product_count}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ── Collapsible section ────────────────────────────────────── */

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-text-tertiary" />
          : <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────── */

export function ProductFilters({
  filters,
  onFiltersChange,
  onClear,
  minPrice = 0,
  maxPrice = 0,
  priceLoading = false,
  selectedCategory,
  onCategorySelect,
}: ProductFiltersProps) {
  const { data: categoryTree } = useCategoryTree()
  const { data: brands } = useBrands()
  const [brandSearch, setBrandSearch] = useState('')

  // Local price state for smooth dragging — only commits to parent on pointer-up
  const [localPrice, setLocalPrice] = useState<[number, number]>(filters.priceRange)
  useEffect(() => { setLocalPrice(filters.priceRange) }, [filters.priceRange])

  const hasActiveFilters =
    filters.inStockOnly ||
    filters.minRating > 0 ||
    filters.brands.length > 0 ||
    filters.priceRange[0] > minPrice ||
    filters.priceRange[1] < maxPrice ||
    !!selectedCategory

  const filteredBrands = (brands ?? []).filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  )

  const toggleBrand = (slug: string) => {
    const next = filters.brands.includes(slug)
      ? filters.brands.filter((s) => s !== slug)
      : [...filters.brands, slug]
    onFiltersChange({ ...filters, brands: next })
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-text-tertiary" />
          <span className="text-[13px] font-semibold text-text-primary">Filters</span>
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {(filters.brands.length > 0 ? 1 : 0) +
                (filters.minRating > 0 ? 1 : 0) +
                (filters.inStockOnly ? 1 : 0) +
                (filters.priceRange[0] > minPrice || filters.priceRange[1] < maxPrice ? 1 : 0) +
                (selectedCategory ? 1 : 0)}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] text-accent hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="divide-y divide-border px-4">

        {/* ── Categories ── */}
        {onCategorySelect && (
          <Section title="Categories">
            <CategoryTree
              tree={categoryTree ?? []}
              selectedCategory={selectedCategory}
              onCategorySelect={onCategorySelect}
            />
          </Section>
        )}

        {/* ── Price Range ── */}
        <Section title="Price Range">
          {priceLoading || maxPrice === 0 ? (
            <div className="space-y-3">
              <div className="h-1.5 w-full rounded-full bg-border animate-pulse" />
              <div className="flex justify-between">
                <div className="h-3 w-10 rounded bg-border animate-pulse" />
                <div className="h-3 w-10 rounded bg-border animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              <Slider
                value={localPrice}
                onValueChange={(v) => setLocalPrice(v as [number, number])}
                onValueCommit={(v) =>
                  onFiltersChange({ ...filters, priceRange: v as [number, number] })
                }
                min={minPrice}
                max={maxPrice}
                step={Math.max(1, Math.floor((maxPrice - minPrice) / 100))}
                aria-label="Price range"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex-1 rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-center text-[13px] font-medium text-text-primary">
                  ${localPrice[0]}
                </div>
                <span className="text-text-tertiary text-[12px]">–</span>
                <div className="flex-1 rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-center text-[13px] font-medium text-text-primary">
                  ${localPrice[1]}
                </div>
              </div>
            </>
          )}
        </Section>

        {/* ── Brands ── */}
        <Section title="Brands">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search brands…"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-subtle py-1.5 pl-8 pr-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          {/* Brand pills / checkboxes */}
          <ul className="space-y-0.5">
            {filteredBrands.map((brand) => {
              const checked = filters.brands.includes(brand.slug)
              return (
                <li key={brand.slug}>
                  <button
                    type="button"
                    onClick={() => toggleBrand(brand.slug)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-100',
                      checked
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                    )}
                  >
                    {/* Custom checkbox */}
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        checked
                          ? 'border-accent bg-accent'
                          : 'border-border bg-surface'
                      )}
                    >
                      {checked && (
                        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-[2]">
                          <polyline points="1 4 3.5 6.5 9 1" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 truncate">{brand.name}</span>
                  </button>
                </li>
              )
            })}
            {filteredBrands.length === 0 && (
              <li className="px-3 py-2 text-[13px] text-text-tertiary">No brands found</li>
            )}
          </ul>
        </Section>

        {/* ── Rating ── */}
        <Section title="Rating">
          <ul className="space-y-0.5">
            {[5, 4, 3].map((stars) => {
              const active = filters.minRating === stars
              return (
                <li key={stars}>
                  <button
                    type="button"
                    onClick={() =>
                      onFiltersChange({ ...filters, minRating: active ? 0 : stars })
                    }
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-100',
                      active
                        ? 'bg-accent/10'
                        : 'hover:bg-bg-subtle'
                    )}
                  >
                    <div className="flex items-center gap-[2px]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3.5 w-3.5',
                            i < stars
                              ? 'fill-amber-400 stroke-amber-400'
                              : 'fill-transparent stroke-border-strong'
                          )}
                        />
                      ))}
                    </div>
                    <span className={cn('text-[13px]', active ? 'text-accent font-medium' : 'text-text-secondary')}>
                      & Up
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>

        {/* ── In Stock ── */}
        <div className="py-3">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-[13px] text-text-primary font-medium">In stock only</span>
            <button
              type="button"
              role="switch"
              aria-checked={filters.inStockOnly}
              onClick={() => onFiltersChange({ ...filters, inStockOnly: !filters.inStockOnly })}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                filters.inStockOnly ? 'bg-accent' : 'bg-border'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  filters.inStockOnly ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </label>
        </div>

      </div>
    </div>
  )
}
