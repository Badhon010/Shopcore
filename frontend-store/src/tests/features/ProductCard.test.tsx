import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import type { Product } from '@/types/models'

const baseProduct: Product = {
  id: 'prod-1',
  name: 'Aria Wireless Headphones',
  slug: 'aria-wireless-headphones',
  description: 'Premium sound quality with noise cancellation.',
  category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
  images: [{ id: 'img-1', url: '/test.jpg', alt: 'Headphones', is_primary: true, ordering: 0 }],
  variants: [],
  price: '199.00',
  rating_average: 4.5,
  rating_count: 128,
  in_stock: true,
  stock: 50,
  is_featured: true,
  created_at: '2025-01-01T00:00:00Z',
}

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText('Aria Wireless Headphones')).toBeInTheDocument()
  })

  it('renders formatted price', () => {
    render(<ProductCard product={baseProduct} />)
    // Store currency is configurable (BDT in production) — assert the amount,
    // not the currency symbol.
    expect(screen.getByText(/199\.00/)).toBeInTheDocument()
  })

  it('renders category name', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText('Electronics')).toBeInTheDocument()
  })

  it('renders rating count', () => {
    render(<ProductCard product={baseProduct} />)
    expect(screen.getByText('(128)')).toBeInTheDocument()
  })

  it('renders sale badge when product is discounted', () => {
    render(
      <ProductCard product={{ ...baseProduct, price: '149.00', original_price: '199.00' }} />
    )
    // The card shows the discount as a percentage badge: -25%.
    expect(screen.getByText('-25%')).toBeInTheDocument()
  })

  it('renders original price with strikethrough when discounted', () => {
    render(
      <ProductCard product={{ ...baseProduct, price: '149.00', original_price: '199.00' }} />
    )
    // The sale price (BDT 149.00) and original price (BDT 199.00) are both
    // rendered; the original must be struck through.
    const originalPrice = screen.getByText(/199\.00/)
    expect(originalPrice).toHaveClass('line-through')
  })

  it('shows out-of-stock badge when not in stock', () => {
    render(<ProductCard product={{ ...baseProduct, in_stock: false, stock: 0 }} />)
    expect(screen.getByText('Sold out')).toBeInTheDocument()
  })

  it('shows low stock badge when stock is low', () => {
    render(<ProductCard product={{ ...baseProduct, stock: 3 }} />)
    expect(screen.getByText('Low stock')).toBeInTheDocument()
  })

  it('links to the product details page', () => {
    render(<ProductCard product={baseProduct} />)
    const link = screen.getByRole('link', { name: /View Aria Wireless Headphones/i })
    expect(link).toHaveAttribute('href', '/products/aria-wireless-headphones')
  })
})
