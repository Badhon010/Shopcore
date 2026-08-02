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
  display_order?: number
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
  /** Absolute URL built by the serializer — prefer this for display */
  url?: string
  image: string
  thumbnail?: string
  alt_text?: string
  is_primary: boolean
  ordering: number
  display_order?: number
}

export interface AttributeValue {
  id: string
  attribute_name: string
  attribute_slug: string
  value: string
  display_order: number
}

export interface Attribute {
  id: string
  name: string
  slug: string
  values: AttributeValue[]
}

export interface ProductVariantAttributeValue {
  id: string
  attribute_name: string
  attribute_slug: string
  value: string
  display_order: number
}

export interface ProductVariant {
  id: string
  sku: string
  /** Attribute values that define this variant (e.g. Size: M, Colour: Red) */
  attribute_values: ProductVariantAttributeValue[]
  /** Optional price that overrides the product base price for this variant */
  price_override?: string | null
  /** Resolved price to display — either price_override or product base_price */
  effective_price: string
  is_active: boolean
  stock_quantity: number
}

export interface AdminProduct {
  id: string
  name: string
  slug: string
  description: string
  short_description?: string
  /** Integer ID from admin endpoint */
  category: number | { id: string | number; name: string; slug?: string }
  category_name?: string
  /** Integer ID from admin endpoint */
  brand?: number | { id: string | number; name: string; slug?: string } | null
  brand_name?: string
  status: ProductStatus
  /** List endpoint returns base_price; detail endpoint may return price */
  base_price?: string
  /** Legacy / detail-endpoint alias — prefer base_price on list */
  price?: string
  original_price?: string
  compare_at_price?: string
  sku?: string
  weight_kg?: string
  meta_title?: string
  meta_description?: string
  is_featured: boolean
  average_rating?: number
  review_count?: number
  /** Single primary image returned by the list endpoint */
  primary_image?: ProductImage | null
  /** Full images array returned by the detail endpoint */
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
// Mirrors apps/orders/constants.py OrderStatus (ALL_CAPS).
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
  id: string
  /** Product name at time of order (snapshot) */
  product_name_snapshot: string
  /** Variant attribute snapshot (e.g. { Size: 'M', Colour: 'Red' }) */
  variant_attributes_snapshot?: Record<string, string> | null
  unit_price_snapshot: string
  quantity: number
  line_total: string
  image_url?: string | null
}

export interface OrderStatusHistoryEntry {
  id: string
  from_status: string
  to_status: string
  changed_by_email?: string | null
  note?: string
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  /** Flat email returned by the admin serializer */
  user_email?: string
  /** Flat full name returned by the admin serializer */
  user_full_name?: string
  /** Nested user object — only present on some endpoints */
  user?: {
    id: string
    email: string
    full_name: string
  }
  status: OrderStatus
  payment_status: PaymentStatus
  items: OrderItem[]
  subtotal: string
  discount_total?: string
  shipping_cost?: string
  tax_total?: string
  grand_total: string
  /** Serialised snapshot returned by admin endpoints */
  shipping_address_snapshot?: {
    full_name: string
    address_line_1: string
    address_line_2?: string
    city: string
    state_province: string
    postal_code: string
    country: string
  }
  billing_address_snapshot?: {
    full_name: string
    address_line_1: string
    address_line_2?: string
    city: string
    state_province: string
    postal_code: string
    country: string
  }
  coupon_code_snapshot?: string
  notes?: string
  placed_at?: string
  created_at: string
  updated_at?: string
  /** Whether this order can be cancelled */
  can_cancel?: boolean
  /** Full status change history */
  status_history?: OrderStatusHistoryEntry[]
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
  /** Warehouse name string returned by the serializer */
  warehouse_name?: string
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
  product: number
  product_name?: string
  user_email?: string
  rating: number
  title?: string
  body: string
  is_verified_purchase?: boolean
  is_approved: boolean
  created_at: string
  updated_at?: string
}

// ── Coupons ──────────────────────────────────────────────────
export interface Coupon {
  id: string
  code: string
  description?: string
  discount_type: 'PERCENTAGE' | 'FIXED'
  discount_value: string
  minimum_order_amount?: string | null
  max_discount_amount?: string | null
  usage_limit_total?: number | null
  usage_limit_per_user?: number | null
  times_used: number
  is_active: boolean
  valid_from?: string | null
  valid_until?: string | null
  created_at: string
}

// ── Newsletter ────────────────────────────────────────────────
export type CampaignStatus = 'draft' | 'sent' | 'sending' | 'failed'

export interface NewsletterSubscriber {
  id: string
  email: string
  active: boolean
  subscribed_at: string
}

export interface NewsletterCampaign {
  id: string
  title: string
  subject: string
  html_body: string
  plain_body?: string
  preview_text?: string
  status: CampaignStatus
  sent_at?: string
  recipient_count?: number
  open_count?: number
  click_count?: number
  open_rate?: number
  click_rate?: number
  created_at: string
  updated_at?: string
}

export interface NewsletterStats {
  total_subscribers: number
  active_subscribers: number
  total_campaigns: number
  sent_campaigns: number
  avg_open_rate?: number
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
/** Top-level flattened KPI aliases returned by GET /dashboard/. */
export interface DashboardKPIs {
  total_revenue: number
  revenue_change_pct?: number
  total_orders: number
  orders_change_pct?: number
  total_customers: number
  customers_change_pct?: number
  low_stock_count: number
  pending_orders: number
  period_days?: number
  generated_at?: string
}

export interface TopProductItem {
  product_id?: number
  product_name: string
  product_slug?: string
  units_sold: number
  revenue: number
}

export interface TopCategoryItem {
  id: number
  name: string
  slug: string
  product_count: number
}

export interface RecentOrderItem {
  id: number
  order_number: string
  status: string
  payment_status: string
  grand_total: number
  placed_at: string
  user_email?: string
}

export interface RecentCustomerItem {
  id: number
  email: string
  full_name: string
  date_joined: string
}

export interface RecentReviewItem {
  id: number
  rating: number
  is_approved: boolean
  created_at: string
  product_name?: string
  user_email?: string
}

export interface DashboardChartPoint {
  date: string
  revenue?: number
  orders?: number
}

export interface LowStockItem {
  id: number
  quantity_on_hand: number
  quantity_reserved: number
  low_stock_threshold: number
  variant_sku?: string
  product_name?: string
  product_slug?: string
  warehouse_name?: string
}

/** Full payload of GET /dashboard/ — every number is a backend aggregate. */
export interface DashboardOverview extends DashboardKPIs {
  revenue: {
    total_all_time: number
    current_period: number
    previous_period: number
    growth_pct: number
    average_order_value: number
  }
  orders: {
    total_all_time: number
    current_period: number
    previous_period: number
    growth_pct: number
    by_status: Record<string, number>
  }
  customers: {
    total: number
    new_current_period: number
    new_previous_period: number
    growth_pct: number
  }
  products: {
    total: number
    by_status: Record<string, number>
  }
  categories: { total: number }
  inventory: {
    low_stock_count: number
    out_of_stock_count: number
  }
  subscribers: {
    total: number
    active: number
    new_current_period: number
    new_previous_period: number
    growth_pct: number
  }
  reviews: {
    total: number
    approved: number
    pending: number
    average_rating: number
  }
  top_products: TopProductItem[]
  top_categories: TopCategoryItem[]
  recent_orders: RecentOrderItem[]
  recent_customers: RecentCustomerItem[]
  recent_reviews: RecentReviewItem[]
  revenue_chart: DashboardChartPoint[]
  orders_chart: DashboardChartPoint[]
  low_stock_items: LowStockItem[]
}

// ── Analytics ──────────────────────────────────────────────────
export type AnalyticsGranularity = 'day' | 'week' | 'month' | 'year'

/** GET /dashboard/analytics/revenue/ */
export interface RevenueAnalytics {
  period_days: number
  granularity: AnalyticsGranularity
  all_time: {
    total_revenue: number
    total_paid_orders: number
    average_order_value: number
  }
  current_period: {
    revenue: number
    orders: number
    aov: number
  }
  previous_period: {
    revenue: number
    orders: number
  }
  revenue_growth_pct: number
  orders_growth_pct: number
  over_time: Array<{ bucket: string; revenue: number; orders: number }>
  payment_status_breakdown: Record<string, number>
}

/** GET /dashboard/analytics/orders/ */
export interface OrderAnalytics {
  period_days: number
  granularity: AnalyticsGranularity
  over_time: Array<{ bucket: string; orders: number }>
  status_distribution: Array<{ status: string; count: number; pct: number }>
  cancellation_rate_pct: number
}

/** GET /dashboard/analytics/best-sellers/ */
export interface BestSellersResponse {
  period_days: number
  results: Array<{
    product_id?: number
    product_name: string
    product_slug?: string
    category_name?: string
    units_sold: number
    revenue: number
    orders: number
  }>
}

/** GET /dashboard/analytics/customers/ */
export interface CustomerGrowthAnalytics {
  period_days: number
  granularity: AnalyticsGranularity
  total_customers: number
  active_customers: number
  over_time: Array<{ bucket: string; new_customers: number }>
}

/** GET /dashboard/analytics/inventory/ */
export interface InventoryAnalytics {
  summary: {
    total_sku_count: number
    in_stock_count: number
    low_stock_count: number
    out_of_stock_count: number
    total_inventory_value: number
  }
  by_warehouse: Array<{
    warehouse_name?: string
    warehouse_code?: string
    total_on_hand: number
    total_reserved: number
    sku_count: number
  }>
}

/** GET /dashboard/analytics/coupons/ */
export interface CouponAnalytics {
  period_days: number
  period_coupon_orders: number
  period_total_discount: number
  top_coupons_this_period: Array<{
    coupon_code?: string
    times_used: number
    total_discount: number
  }>
  all_coupons: Array<{
    code: string
    discount_type: string
    discount_value: number
    times_used: number
    is_active: boolean
  }>
}

/** GET /dashboard/analytics/newsletter/ */
export interface NewsletterAnalytics {
  period_days: number
  granularity: AnalyticsGranularity
  total_subscribers: number
  active_subscribers: number
  growth_over_time: Array<{ bucket: string; new_subscribers: number }>
  recent_campaign_stats: Array<{
    id: number
    title: string
    subject: string
    sent_at?: string
    recipient_count: number
    open_count: number
    click_count: number
    open_rate: number
    click_rate: number
  }>
}


// ── Payments ─────────────────────────────────────────────────
export type PaymentProvider =
  | 'MANUAL'
  | 'BANK_TRANSFER'
  | 'BKASH'
  | 'NAGAD'
  | 'ROCKET'
  | 'SSLCOMMERZ'
  | 'STRIPE'
  | 'PAYPAL'

export interface PaymentMethod {
  id: string
  provider: PaymentProvider
  name: string
  description?: string
  is_enabled: boolean
  sort_order: number
  instructions?: string
  account_number?: string
  account_name?: string
  qr_image?: string | null
  payment_notes?: string
  is_sandbox: boolean
  gateway_config?: Record<string, unknown> | null
  /** Whether the gateway's env credentials are configured (H-3). */
  is_configured: boolean
  created_at: string
  updated_at: string
}

export interface ManualPaymentSubmission {
  id: string
  order: string
  order_number: string
  customer_email?: string | null
  method_provider?: string | null
  method_name?: string | null
  reference_number: string
  receipt?: string | null
  receipt_url?: string | null
  notes?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  admin_note?: string
  reviewed_at?: string | null
  created_at: string
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
