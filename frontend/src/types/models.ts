export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_number?: string
  avatar?: string
  date_joined: string
  is_email_verified: boolean
}

/** Lightweight parent reference returned by CategoryDetailSerializer. */
export interface CategoryRef {
  id: string
  name: string
  slug: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  /** Full parent object when fetched from detail endpoint; null for root categories. */
  parent?: CategoryRef | null
  children?: Category[]
  product_count?: number
}

export interface Brand {
  id: string
  name: string
  slug: string
  description?: string
  logo?: string
}

export interface ProductImage {
  id: string
  url: string
  alt: string
  is_primary: boolean
  ordering: number
}

export interface ProductVariantOption {
  name: string
  value: string
}

export interface ProductVariant {
  id: string
  sku: string
  options: ProductVariantOption[]
  price: string
  original_price?: string
  stock: number
  is_available: boolean
  images?: ProductImage[]
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  short_description?: string
  category: Category
  images: ProductImage[]
  variants: ProductVariant[]
  default_variant?: ProductVariant
  price: string
  original_price?: string
  rating_average: number
  rating_count: number
  in_stock: boolean
  stock?: number
  is_featured: boolean
  specifications?: Record<string, string>
  tags?: string[]
  created_at: string
}

export interface Banner {
  id: string
  title: string
  subtitle?: string
  eyebrow?: string
  image: string
  cta_text?: string
  cta_link?: string
  secondary_cta_text?: string
  secondary_cta_link?: string
  display_order: number
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder'

export interface CartItem {
  id: string
  product: Product
  variant?: ProductVariant
  quantity: number
  unit_price: string
  total_price: string
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: string
  discount?: string
  coupon?: Coupon
  estimated_shipping?: string
  estimated_tax?: string
  total: string
  item_count: number
}

export interface Coupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  description?: string
}

export interface Address {
  id: string
  /** Combined full name — maps to the serializer's `full_name` field. */
  full_name: string
  /** E.164-ish phone number, e.g. "+12025551234" — required by the backend. */
  phone_number: string
  address_line_1: string
  address_line_2?: string
  city: string
  /** Maps to the serializer's `state_province` field. */
  state_province: string
  postal_code: string
  /** ISO 3166-1 alpha-2, e.g. "US". */
  country: string
  address_type: 'SHIPPING' | 'BILLING' | 'BOTH'
  is_default: boolean
  created_at: string
  updated_at: string
}

// OrderStatus values mirror the backend OrderStatus.TextChoices (ALL_CAPS).
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

/**
 * Address frozen at order-creation time (source of truth even if the user
 * later edits or deletes the saved address). Matches _serialize_address() in
 * apps/orders/services.py.
 */
export interface OrderAddressSnapshot {
  full_name: string
  phone_number: string
  address_line_1: string
  address_line_2?: string
  city: string
  state_province: string
  postal_code: string
  country: string
}

/**
 * Order line item — all data is frozen at order-creation time (snapshots).
 * There is no live Product/Variant object; use the snapshot fields for display.
 */
export interface OrderItem {
  id: string
  product_name_snapshot: string
  variant_attributes_snapshot: Record<string, string>
  unit_price_snapshot: string
  quantity: number
  line_total: string
  image_url: string | null
}

/** One entry in the order status audit trail (OrderStatusHistory model). */
export interface OrderStatusEvent {
  id: string
  from_status: string
  to_status: OrderStatus
  changed_by_email: string | null
  note: string
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: string
  items: OrderItem[]
  /** Address snapshot — use this for display; the FK may have been deleted. */
  shipping_address_snapshot: OrderAddressSnapshot
  billing_address_snapshot: OrderAddressSnapshot
  subtotal: string
  discount_total: string
  shipping_cost: string
  tax_total: string
  grand_total: string
  coupon_code_snapshot: string
  notes: string
  /** ISO datetime string — when the order was placed (auto_now_add). */
  placed_at: string
  status_history: OrderStatusEvent[]
  can_cancel: boolean
}

export interface Review {
  id: string
  user: Pick<User, 'id' | 'full_name' | 'avatar'>
  product: string
  rating: number
  title?: string
  body: string
  is_verified_purchase: boolean
  helpful_count: number
  created_at: string
}

export interface WishlistItem {
  id: string
  product: Product
  added_at: string
}

export interface Notification {
  id: string
  title: string
  body: string
  /** Matches the backend serializer field: "order" | "promotion" | "system" | "review" */
  notification_type: string
  is_read: boolean
  action_url?: string
  created_at: string
}

