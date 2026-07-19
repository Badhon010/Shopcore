// Adapters that reconcile the backend's actual catalog serializer shapes
// (see apps/catalog/serializers.py) with the frontend's `Product`/`Category`
// types. The backend's list vs. detail serializers expose different field
// sets (e.g. list has `primary_image`/`min_price`, detail has full
// `images`/`variants`), so these functions are the single place that
// normalizes both into one consistent shape for the UI.
import type { Cart, CartItem, Category, Product, ProductImage, ProductVariant, WishlistItem } from '@/types/models'

// Raw shapes as returned by Django REST Framework — intentionally loose
// since we only read the fields we normalize below.
/* eslint-disable @typescript-eslint/no-explicit-any */
type RawCategory = any
type RawProduct = any
type RawCart = any
type RawCartItem = any
type RawWishlistItem = any
/* eslint-enable @typescript-eslint/no-explicit-any */

export function normalizeCategory(raw: RawCategory): Category {
  return {
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? undefined,
    image: raw.image ?? undefined,
    parent: raw.parent ? String(raw.parent.id ?? raw.parent) : null,
    children: Array.isArray(raw.children) ? raw.children.map(normalizeCategory) : undefined,
    product_count: raw.product_count,
  }
}

function normalizeImage(raw: RawCategory, index: number): ProductImage {
  return {
    id: String(raw.id ?? index),
    url: raw.image ?? raw.url ?? '',
    alt: raw.alt_text ?? raw.alt ?? '',
    is_primary: raw.is_primary ?? index === 0,
    ordering: raw.display_order ?? raw.ordering ?? index,
  }
}

function normalizeVariant(raw: RawCategory): ProductVariant {
  const options = Array.isArray(raw.attribute_values)
    ? raw.attribute_values.map((av: RawCategory) => ({ name: av.attribute_name, value: av.value }))
    : []
  return {
    id: String(raw.id),
    sku: raw.sku,
    options,
    price: String(raw.effective_price ?? raw.price_override ?? ''),
    original_price: raw.price_override ? undefined : undefined,
    stock: raw.stock_quantity ?? 0,
    is_available: raw.is_active ?? true,
    images: undefined,
  }
}

export function normalizeProduct(raw: RawProduct): Product {
  const variants: ProductVariant[] = Array.isArray(raw.variants) ? raw.variants.map(normalizeVariant) : []
  const defaultVariant = variants.find((v) => v.is_available) ?? variants[0]

  const images: ProductImage[] = Array.isArray(raw.images) && raw.images.length > 0
    ? raw.images.map(normalizeImage)
    : raw.primary_image
      ? [normalizeImage(raw.primary_image, 0)]
      : []

  const price = defaultVariant?.price || String(raw.min_price ?? raw.base_price ?? '0')
  const comparePrice = raw.compare_at_price ? String(raw.compare_at_price) : undefined
  const originalPrice = comparePrice && Number(comparePrice) > Number(price) ? comparePrice : undefined

  // The list serializer includes no stock data at all, so we optimistically
  // assume in-stock until the detail view (which has real variant stock) is
  // loaded.
  const totalStock = variants.length > 0 ? variants.reduce((sum, v) => sum + (v.stock ?? 0), 0) : undefined
  const inStock = totalStock === undefined ? true : totalStock > 0

  return {
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? raw.short_description ?? '',
    short_description: raw.short_description ?? undefined,
    category: raw.category ? normalizeCategory(raw.category) : ({} as Category),
    images,
    variants,
    default_variant: defaultVariant,
    price,
    original_price: originalPrice,
    rating_average: raw.average_rating !== undefined ? Number(raw.average_rating) : 0,
    rating_count: raw.review_count ?? 0,
    in_stock: inStock,
    stock: totalStock,
    is_featured: raw.is_featured ?? false,
    specifications: undefined,
    tags: undefined,
    created_at: raw.created_at ?? '',
  }
}

// --- Cart -------------------------------------------------------------
// Adapters that reconcile apps/cart/serializers.py with the frontend's
// `Cart`/`CartItem` types. The backend nests a minimal `product` object
// (id/name/slug/images) directly on each cart item — see
// `CartProductSerializer` — because the cart UI links/renders a product
// without pulling the full catalog Product shape.
function normalizeCartItem(raw: RawCartItem): CartItem {
  const variant = raw.variant ? normalizeVariant(raw.variant) : undefined
  const rawProduct = raw.product ?? {}

  const product: Product = {
    id: String(rawProduct.id ?? ''),
    name: rawProduct.name ?? '',
    slug: rawProduct.slug ?? '',
    description: '',
    category: {} as Category,
    images: Array.isArray(rawProduct.images) ? rawProduct.images.map(normalizeImage) : [],
    variants: [],
    price: variant?.price ?? '0',
    rating_average: 0,
    rating_count: 0,
    in_stock: variant?.is_available ?? true,
    is_featured: false,
    created_at: '',
  }

  return {
    id: String(raw.id),
    product,
    variant,
    quantity: raw.quantity,
    unit_price: String(raw.unit_price ?? raw.unit_price_snapshot ?? '0'),
    total_price: String(raw.total_price ?? raw.line_total ?? '0'),
  }
}

export function normalizeCart(raw: RawCart): Cart {
  return {
    id: String(raw.id),
    items: Array.isArray(raw.items) ? raw.items.map(normalizeCartItem) : [],
    subtotal: String(raw.subtotal ?? '0'),
    // Coupons/shipping/tax are not persisted on the cart resource — see
    // useApplyCoupon/useRemoveCoupon, which merge that state into the
    // query cache client-side on top of these defaults.
    discount: undefined,
    coupon: undefined,
    estimated_shipping: undefined,
    estimated_tax: undefined,
    total: String(raw.total ?? raw.subtotal ?? '0'),
    item_count: raw.item_count ?? 0,
  }
}

// --- Wishlist -----------------------------------------------------------
export function normalizeWishlistItem(raw: RawWishlistItem): WishlistItem {
  return {
    id: String(raw.id),
    product: normalizeProduct(raw.product ?? {}),
    added_at: raw.added_at ?? '',
  }
}
