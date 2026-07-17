import { Select, type SelectOption } from '@/components/ui/Select'

const SORT_OPTIONS: SelectOption[] = [
  { value: '', label: 'Popularity' },
  { value: 'base_price', label: 'Price: Low to High' },
  { value: '-base_price', label: 'Price: High to Low' },
  { value: '-created_at', label: 'Newest' },
  { value: '-average_rating', label: 'Top Rated' },
]

interface SortDropdownProps {
  value: string
  onChange: (value: string) => void
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <Select
      options={SORT_OPTIONS}
      value={value}
      onValueChange={onChange}
      placeholder="Sort by"
      className="min-w-[160px]"
    />
  )
}
