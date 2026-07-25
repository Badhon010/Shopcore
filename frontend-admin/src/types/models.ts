// ─────────────────────────────────────────────────────────────
// ShopCore Admin — Domain models
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_number?: string
  date_joined: string
  is_email_verified: boolean
  is_staff: boolean
  is_superuser?: boolean
  is_active?: boolean
}

// ── Catalog ──────────────────────────────────────────────────

export interface Category {
  id: number
  name: string
  slug: string
  parent: number | null
  children?: Category[]
  description?: string
  image?: string | null
  display_order: number
  meta_title?: string
  meta_description?: string
}

export interface Brand {
  id: number
  name: string
  slug: string
  logo?: string | null
  description?: string
}

export interface ProductImage {
  id: number
  image: string
  alt_text?: string
  display_order: number
  is_primary: boolean
}

export interface ProductVariant {
  id: number
  sku: string
  name: string
  price?: string
  weight_kg?: string
  stock?: number
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

export interface Product {
  id: number
  name: string
  slug: string
  category: number | null
  category_name?: string
  brand: number | null
  brand_name?: string
  description?: string
  short_description?: string
  base_price: string
  compare_at_price?: string | null
  sku?: string
  status: ProductStatus
  is_featured: boolean
  weight_kg?: string
  average_rating?: number
  review_count?: number
  images: ProductImage[]
  variants: ProductVariant[]
}

export interface Banner {
  id: number
  title: string
  subtitle?: string
  image: string
  cta_label?: string
  cta_url?: string
  is_active: boolean
  display_order: number
}

// ── Orders ───────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface OrderItem {
  id: number
  product_name: string
  variant_sku: string
  quantity: number
  unit_price: string
  total_price: string
  image?: string
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus
  timestamp: string
  note?: string
}

export interface Order {
  id: number
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  user_email?: string
  shipping_address_snapshot: Record<string, unknown>
  billing_address_snapshot?: Record<string, unknown>
  subtotal: string
  discount_total: string
  shipping_cost: string
  tax_total: string
  grand_total: string
  coupon_code_snapshot?: string | null
  items: OrderItem[]
  status_history: OrderStatusHistoryEntry[]
  created_at: string
  updated_at?: string
  notes?: string
}

// ── Inventory ────────────────────────────────────────────────

export interface Warehouse {
  id: number
  name: string
  code: string
  city: string
  country: string
  is_default: boolean
}

export interface StockItem {
  id: number
  variant_sku: string
  product_name: string
  warehouse_name: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  low_stock_threshold: number
  is_low_stock: boolean
  updated_at: string
}

// ── Reviews ──────────────────────────────────────────────────

export interface Review {
  id: number
  product: number
  product_name?: string
  product_slug?: string
  user_email: string
  rating: number
  title: string
  body: string
  is_verified_purchase: boolean
  is_approved: boolean
  created_at: string
  updated_at: string
}

// ── Coupons ──────────────────────────────────────────────────

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'

export interface Coupon {
  id: number
  code: string
  discount_type: DiscountType
  discount_value: string
  minimum_order_amount?: string | null
  max_discount_amount?: string | null
  valid_from: string
  valid_until: string
  usage_limit_total?: number | null
  usage_limit_per_user?: number | null
  times_used: number
  is_active: boolean
}

// ── Newsletter ───────────────────────────────────────────────

export interface NewsletterSubscriber {
  id: number
  email: string
  active: boolean
  subscribed_at: string
  created_at: string
}

export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'failed'

export interface NewsletterCampaign {
  id: number
  title: string
  subject: string
  preview_text: string
  html_body: string
  plain_body: string
  status: CampaignStatus
  sent_at: string | null
  recipient_count: number
  open_count: number
  click_count: number
  open_rate: number
  click_rate: number
  created_at: string
  updated_at: string
}

export interface NewsletterStats {
  total_subscribers: number
  active_subscribers: number
  inactive_subscribers: number
  new_this_month: number
  new_last_month: number
  campaigns_sent: number
  campaigns_draft: number
  avg_open_rate: number
  avg_click_rate: number
}

// ── Notifications ────────────────────────────────────────────

export interface Notification {
  id: number
  message: string
  is_read: boolean
  created_at: string
  link?: string
}
