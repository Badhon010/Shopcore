import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Search, Truck, RotateCcw, Package, User, HelpCircle, ArrowRight, MessageCircle } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Accordion } from '@/components/ui/Accordion'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'

/* ─── Data ───────────────────────────────────────────────────── */
type Category = 'all' | 'shipping' | 'returns' | 'products' | 'account'

interface FaqItem {
  q: string
  a: string
  category: Exclude<Category, 'all'>
}

const FAQS: FaqItem[] = [
  {
    category: 'shipping',
    q: 'How long does shipping take?',
    a: 'Standard shipping takes 5–7 business days. Express shipping (2–3 business days) is available at checkout for an additional fee. Free standard shipping on all orders over $50.',
  },
  {
    category: 'shipping',
    q: 'Do you ship internationally?',
    a: 'Yes, we ship to over 50 countries. International shipping rates and delivery times are calculated at checkout based on your location and the weight of your order.',
  },
  {
    category: 'shipping',
    q: 'How do I track my order?',
    a: "Once your order ships, you'll receive a tracking email with a link. You can also visit the Track Order page at any time using your order number and email address.",
  },
  {
    category: 'returns',
    q: 'What is your return policy?',
    a: 'We offer free returns within 30 days of delivery. Items must be in their original, unworn condition with all tags attached. To start a return, go to your orders page and select "Return item".',
  },
  {
    category: 'returns',
    q: 'Can I exchange an item?',
    a: "Yes. Start a return for the original item and place a new order for the replacement. If the items are the same price, we'll waive the shipping on your re-order — just contact us and we'll sort it out.",
  },
  {
    category: 'returns',
    q: 'When will I receive my refund?',
    a: "Once we receive and inspect your return, refunds are issued within 3–5 business days to your original payment method. You'll receive a confirmation email when the refund is processed.",
  },
  {
    category: 'products',
    q: 'Are your products sustainably sourced?',
    a: 'We evaluate every supplier against strict environmental and ethical criteria. We look for partners who share our values around fair labour practices, responsible material sourcing, and minimal waste production.',
  },
  {
    category: 'products',
    q: 'How do I care for my products?',
    a: "Care instructions are listed on each product page and printed on the product's label. When in doubt, always follow the label — it has the most accurate guidance for that specific item.",
  },
  {
    category: 'products',
    q: 'Are product photos accurate?',
    a: "We work hard to represent colours and textures faithfully. Monitor calibration can affect appearance, so if you're unsure about a colour, check the product description for Pantone or hex references, or contact us.",
  },
  {
    category: 'account',
    q: 'Can I change or cancel my order?',
    a: 'Orders can be modified or cancelled within 1 hour of placement. After that, they enter fulfilment and cannot be changed. Contact us immediately via the Contact page if you need to make changes.',
  },
  {
    category: 'account',
    q: 'How do I reset my password?',
    a: "Click \"Forgot password\" on the login page. Enter your email address and we'll send a reset link within a few minutes. Check your spam folder if it doesn't arrive.",
  },
  {
    category: 'account',
    q: 'Can I use multiple addresses?',
    a: 'Yes — you can save and manage multiple delivery addresses from the Addresses section of your account dashboard.',
  },
]

const CATEGORIES: { value: Category; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'all', label: 'All topics', icon: HelpCircle },
  { value: 'shipping', label: 'Shipping & tracking', icon: Truck },
  { value: 'returns', label: 'Returns & refunds', icon: RotateCcw },
  { value: 'products', label: 'Products', icon: Package },
  { value: 'account', label: 'Account & orders', icon: User },
]

/* ─── Component ──────────────────────────────────────────────── */
export function FaqPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return FAQS.filter((f) => {
      const categoryMatch = activeCategory === 'all' || f.category === activeCategory
      const searchMatch = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
      return categoryMatch && searchMatch
    })
  }, [activeCategory, query])

  const accordionItems = filtered.map((f, i) => ({
    value: `faq-${i}`,
    trigger: f.q,
    content: f.a,
  }))

  return (
    <>
      <Helmet>
        <title>FAQ — ShopCore</title>
        <meta name="description" content="Frequently asked questions about shipping, returns, products, and your ShopCore account." />
      </Helmet>

      {/* ── Hero header ──────────────────────────────────────── */}
      <div className="bg-background-subtle border-b border-border">
        <PageContainer className="py-14 md:py-20 text-center max-w-2xl">
          <span className="text-overline font-semibold uppercase tracking-widest text-primary">
            Help centre
          </span>
          <h1 className="mt-3 text-heading-xl font-bold text-text-primary">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-body-md text-text-secondary">
            Quick answers to common questions. Can't find what you're looking for?{' '}
            <Link to={ROUTES.CONTACT} className="whitespace-nowrap text-primary font-medium underline underline-offset-2 hover:no-underline">
              Contact us
            </Link>{' '}
            and we'll help.
          </p>

          {/* Search */}
          <div className="mt-8 relative max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <Input
              type="search"
              placeholder="Search questions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </PageContainer>
      </div>

      <PageContainer className="py-14 max-w-4xl">

        {/* ── Category tabs ─────────────────────────────────── */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="FAQ categories">
          {CATEGORIES.map(({ value, label, icon: Icon }) => {
            const isActive = activeCategory === value
            return (
              <button
                key={value}
                role="tab"
                aria-selected={isActive}
                aria-controls="faq-panel"
                onClick={() => setActiveCategory(value)}
                className={[
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-body-sm font-medium border transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-surface border-border text-text-secondary hover:border-border-strong hover:text-text-primary',
                ].join(' ')}
                style={{ transitionDuration: 'var(--duration-base)' }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
                <span
                  className={[
                    'ml-0.5 rounded-full px-1.5 py-0.5 text-overline font-semibold',
                    isActive ? 'bg-white/20 text-white' : 'bg-secondary text-text-muted',
                  ].join(' ')}
                >
                  {value === 'all'
                    ? FAQS.length
                    : FAQS.filter((f) => f.category === value).length}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Accordion or empty state ──────────────────────── */}
        <div id="faq-panel" role="tabpanel">
        {accordionItems.length > 0 ? (
          <div className="rounded-xl bg-surface border border-border shadow-xs overflow-hidden">
            <Accordion
              type="single"
              items={accordionItems}
              className="divide-y divide-border px-6"
            />
          </div>
        ) : (
          <div className="text-center py-20 rounded-xl bg-surface border border-border">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-4">
              <HelpCircle className="h-6 w-6 text-text-muted" />
            </span>
            <p className="text-heading-sm font-semibold text-text-primary">No results found</p>
            <p className="mt-2 text-body-sm text-text-secondary">
              Try a different search term or browse all topics.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => { setQuery(''); setActiveCategory('all') }}
            >
              Clear filters
            </Button>
          </div>
        )}
        </div>

        {/* ── Bottom CTA ───────────────────────────────────── */}
        <div
          className="mt-12 rounded-xl p-8 text-center border"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary-light)) 0%, hsl(var(--background-subtle)) 100%)',
            borderColor: 'hsl(var(--primary)/0.2)',
          }}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-light mb-4">
            <MessageCircle className="h-5 w-5 text-primary" />
          </span>
          <h2 className="text-heading-md font-semibold text-text-primary">
            Still have questions?
          </h2>
          <p className="mt-2 text-body-sm text-text-secondary max-w-sm mx-auto">
            Our team is available Monday to Friday, 9 am – 6 pm EST.
            We typically reply within 4 hours.
          </p>
          <Button asChild size="md" className="mt-6">
            <Link to={ROUTES.CONTACT} className="inline-flex items-center gap-2">
              Get in touch <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </PageContainer>
    </>
  )
}
