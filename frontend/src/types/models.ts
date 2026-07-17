export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone?: string
  avatar?: string
  date_joined: string
  is_email_verified: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image?: string
  parent?: string | null
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
  first_name: string
  last_name: string
  company?: string
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
  is_default: boolean
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded'

export interface OrderItem {
  id: string
  product: Product
  variant?: ProductVariant
  quantity: number
  unit_price: string
  total_price: string
}

export interface OrderStatusEvent {
  status: OrderStatus
  timestamp: string
  note?: string
}

export interface Order {
  id: string
  order_number: string
  status: OrderStatus
  items: OrderItem[]
  shipping_address: Address
  billing_address: Address
  subtotal: string
  discount?: string
  coupon?: Coupon
  shipping_cost: string
  tax?: string
  total: string
  payment_method?: string
  tracking_number?: string
  estimated_delivery?: string
  status_history: OrderStatusEvent[]
  created_at: string
  updated_at: string
  invoice_url?: string
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
  type: 'order' | 'promotion' | 'system' | 'review'
  is_read: boolean
  action_url?: string
  created_at: string
}

export interface ShippingMethod {
  id: string
  name: string
  description?: string
  price: string
  estimated_days: string
}

export interface CheckoutSession {
  id: string
  cart: Cart
  shipping_address?: Address
  billing_address?: Address
  shipping_method?: ShippingMethod
  available_shipping_methods: ShippingMethod[]
  payment_intent_client_secret?: string
  total: string
}
