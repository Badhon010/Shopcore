import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { CartLineItem } from '@/features/cart/components/CartLineItem'
import type { CartItem } from '@/types/models'

// Mock the cart mutations
const mockUpdateItem = vi.fn()
const mockRemoveItem = vi.fn()

vi.mock('@/features/cart/hooks/useCart', () => ({
  useUpdateCartItem: () => ({
    mutate: mockUpdateItem,
    isPending: false,
  }),
  useRemoveCartItem: () => ({
    mutate: mockRemoveItem,
    isPending: false,
  }),
}))

const item: CartItem = {
  id: 'item-1',
  product: {
    id: 'prod-1',
    name: 'Aria Wireless Headphones',
    slug: 'aria-wireless-headphones',
    description: 'Premium headphones',
    category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    images: [{ id: 'img-1', url: '/test.jpg', alt: 'Headphones', is_primary: true, ordering: 0 }],
    variants: [],
    price: '199.00',
    rating_average: 4.5,
    rating_count: 100,
    in_stock: true,
    is_featured: false,
    created_at: '2025-01-01T00:00:00Z',
  },
  quantity: 2,
  unit_price: '199.00',
  total_price: '398.00',
}

describe('CartLineItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders product name and price', () => {
    render(<CartLineItem item={item} />)
    expect(screen.getByText('Aria Wireless Headphones')).toBeInTheDocument()
    expect(screen.getByText(/\$398\.00/)).toBeInTheDocument()
  })

  it('renders current quantity', () => {
    render(<CartLineItem item={item} />)
    expect(screen.getByLabelText(/quantity: 2/i)).toBeInTheDocument()
  })

  it('calls updateItem when quantity is decreased', async () => {
    const user = userEvent.setup()
    render(<CartLineItem item={item} />)
    await user.click(screen.getByLabelText('Decrease quantity'))
    expect(mockUpdateItem).toHaveBeenCalledWith({
      itemId: 'item-1',
      payload: { quantity: 1 },
    })
  })

  it('calls updateItem when quantity is increased', async () => {
    const user = userEvent.setup()
    render(<CartLineItem item={item} />)
    await user.click(screen.getByLabelText('Increase quantity'))
    expect(mockUpdateItem).toHaveBeenCalledWith({
      itemId: 'item-1',
      payload: { quantity: 3 },
    })
  })

  it('calls removeItem when remove button is clicked', async () => {
    const user = userEvent.setup()
    render(<CartLineItem item={item} />)
    await user.click(screen.getByLabelText(/remove aria wireless headphones/i))
    expect(mockRemoveItem).toHaveBeenCalledWith('item-1')
  })

  it('disables decrease button when quantity is 1', () => {
    render(<CartLineItem item={{ ...item, quantity: 1 }} />)
    expect(screen.getByLabelText('Decrease quantity')).toBeDisabled()
  })
})
