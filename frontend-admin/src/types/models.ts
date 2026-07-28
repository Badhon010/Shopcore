// ── Users ───────────────────────────────────────────────────
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
  is_staff: boolean
  is_superuser?: boolean
  is_active: boolean
  last_login?: string
}

// ── Catalog ──────────────────────────────────────────────────
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  parent?: { id: string; name: string; slug: string } | null
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
  image: string
  alt_text?: string
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
  is_available: boolean
}

export interface AdminProduct {
  id: string
  name: string
  slug: string
  description: string
  short_description?: string
  /** Integer ID from admin endpoint */
  category: number
  category_name?: string
  /** Integer ID from admin endpoint */
  brand?: number | null
  brand_name?: string
  status: ProductStatus
  price: string
  original_price?: string
  is_featured: boolean
  images?: ProductImage[]
  variants?: ProductVariant[]
  created_at: string
  updated_at?: string
}

export interface Banner {
  id: string
  title: string
  subtitle?: string
  image?: string
  cta_text?: string
  cta_link?: string
  is_active: boolean
  display_order: number
  created_at?: string
}

// ── Orders ───────────────────────────────────────────────────
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface OrderItem {
  id: string
  product_name: string
  product_slug?: string
  variant_sku?: string
  quantity: number
  unit_price: string
  total_price: string
}

export interface Order {
  id: string
  order_number: string
  user?: {
    id: string
    email: string
    full_name: string
  }
  status: OrderStatus
  payment_status: PaymentStatus
  items: OrderItem[]
  subtotal: string
  discount?: string
  shipping_cost?: string
  tax?: string
  grand_total: string
  shipping_address?: {
    full_name: string
    address_line_1: string
    address_line_2?: string
    city: string
    state_province: string
    postal_code: string
    country: string
  }
  coupon_code?: string
  notes?: string
  created_at: string
  updated_at?: string
}

export interface OrderStats {
  total_orders: number
  pending_orders: number
  revenue_today: string
  revenue_this_month: string
  orders_today: number
  orders_this_week?: number
}

// ── Inventory ────────────────────────────────────────────────
export interface StockItem {
  id: string
  product_name: string
  variant_sku: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  low_stock_threshold: number
  is_low_stock: boolean
  is_out_of_stock: boolean
  warehouse?: string
}

export interface StockMovement {
  id: string
  movement_type: string
  quantity_delta: number
  quantity_before: number
  quantity_after: number
  reason?: string
  created_at: string
  created_by?: string
}

export interface Warehouse {
  id: string
  name: string
  address?: string
}

// ── Reviews ──────────────────────────────────────────────────
export interface Review {
  id: string
  product_name: string
  product_slug?: string
  user_email?: string
  user_name?: string
  rating: number
  title?: string
  body: string
  is_approved: boolean
  created_at: string
}

// ── Coupons ──────────────────────────────────────────────────
export type CouponDiscountType = 'percentage' | 'fixed'

export interface Coupon {
  id: string
  code: string
  description?: string
  discount_type: CouponDiscountType
  discount_value: string
  minimum_order_amount?: string
  usage_limit?: number
  usage_count: number
  usage_limit_per_user?: number
  is_active: boolean
  valid_from?: string
  valid_to?: string
  created_at: string
}

// ── Newsletter ────────────────────────────────────────────────
export type CampaignStatus = 'DRAFT' | 'SENT' | 'SCHEDULED'

export interface NewsletterSubscriber {
  id: string
  email: string
  is_active: boolean
  subscribed_at: string
}

export interface NewsletterCampaign {
  id: string
  subject: string
  body: string
  status: CampaignStatus
  sent_at?: string
  created_at: string
}

export interface NewsletterStats {
  total_subscribers: number
  active_subscribers: number
  total_campaigns: number
  sent_campaigns: number
}

// ── Notifications ─────────────────────────────────────────────
export interface Notification {
  id: string
  title: string
  body: string
  notification_type: string
  is_read: boolean
  action_url?: string
  created_at: string
}

// ── Dashboard ─────────────────────────────────────────────────
export interface DashboardKPIs {
  total_revenue: string
  revenue_change_pct?: number
  total_orders: number
  orders_change_pct?: number
  total_customers: number
  customers_change_pct?: number
  low_stock_count: number
  pending_orders: number
}

export interface RevenueDataPoint {
  date: string
  revenue: string | number
}

export interface OrderVolumeDataPoint {
  date: string
  orders: number
}

export interface BestSellerItem {
  product_name: string
  product_slug?: string
  revenue: string | number
  units_sold: number
}

// ── Contact ───────────────────────────────────────────────────
export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED'

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject?: string
  message: string
  status: ContactStatus
  created_at: string
  resolved_at?: string
}
