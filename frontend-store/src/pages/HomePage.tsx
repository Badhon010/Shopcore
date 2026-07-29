import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Truck,
  RefreshCw,
  Headphones,
  Smartphone,
  Laptop,
  Watch,
  Cable,
  Speaker,
  Grid3x3,
  Phone,
  Monitor,
  Gamepad,
  Shirt,
  Baby,
  Sparkles,
  HeartPulse,
  Activity,
  Dumbbell,
  BookOpen,
  PenLine,
  Car,
  Bike,
  Wrench,
  Flower,
  PawPrint,
  Sofa,
  House,
  Lamp,
  UtensilsCrossed,
  Microwave,
  Gem,
  ShoppingBag,
  Plane,
  ShoppingCart,
  Wine,
  Coffee,
  Leaf,
  Gift,
  Music,
  Film,
  Briefcase,
  Factory,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProductGrid } from '@/features/catalog/components/ProductGrid'
import { useBanners, useFeaturedProducts, useCategoryTree } from '@/features/catalog/hooks/useProducts'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { ROUTES, buildRoute } from '@/constants/routes'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/feedback/Skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { env } from '@/config/env'
import heroBanner from '@/assets/hero-banner.jpg'
import type { ComponentType } from 'react'

const fadeUp = (reducedMotion: boolean) => ({
  initial: reducedMotion ? {} : { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.2, 0, 0, 1] },
})

const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  // Tech & Electronics
  electronics: Smartphone,
  phones: Phone,
  laptops: Laptop,
  computers: Monitor,
  gaming: Gamepad,
  audio: Headphones,
  wearables: Watch,
  accessories: Cable,
  speakers: Speaker,
  // Fashion & Apparel
  fashion: Shirt,
  'mens-fashion': Shirt,
  'womens-fashion': Shirt,
  kids: Baby,
  // Beauty & Health
  beauty: Sparkles,
  cosmetics: Sparkles,
  health: HeartPulse,
  sports: Activity,
  fitness: Dumbbell,
  // Books & Stationery
  books: BookOpen,
  stationery: PenLine,
  // Automotive
  automotive: Car,
  motorcycle: Bike,
  tools: Wrench,
  // Home & Garden
  garden: Flower,
  pets: PawPrint,
  baby: Baby,
  furniture: Sofa,
  home: House,
  'home-decor': Lamp,
  kitchen: UtensilsCrossed,
  appliances: Microwave,
  // Jewelry & Accessories
  jewelry: Gem,
  watches: Watch,
  bags: ShoppingBag,
  travel: Plane,
  // Food & Grocery
  grocery: ShoppingCart,
  food: UtensilsCrossed,
  drinks: Wine,
  coffee: Coffee,
  tea: Coffee,
  organic: Leaf,
  // Other
  gift: Gift,
  toys: Gamepad,
  music: Music,
  movies: Film,
  office: Briefcase,
  industrial: Factory,
}

function getCategoryIcon(slug: string) {
  return CATEGORY_ICONS[slug] ?? Grid3x3
}

const HERO_SLIDES = [
  {
    eyebrow: 'Exclusive Collection',
    heading: 'Discover premium products, every day',
    subtext: 'Artisan goods, ethically made. From independent makers who care about their craft as much as you do.',
  },
  {
    eyebrow: 'New Season',
    heading: 'Fresh styles just landed',
    subtext: 'Explore the newest arrivals across fashion, tech, and home — updated weekly.',
  },
  {
    eyebrow: 'Limited Time',
    heading: 'Up to 30% off best sellers',
    subtext: "Our most-loved products at their best prices. Don't miss out while stock lasts.",
  },
]
const FEATURED_TABS = ['All', 'Best Sellers', 'New Arrivals', 'Top Rated']

export function HomePage() {
  const reducedMotion = usePrefersReducedMotion()
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeTab, setActiveTab] = useState(FEATURED_TABS[0])

  const { data: banners } = useBanners()
  // Slides come from the database; fall back to the static copy only if the
  // backend has no banners configured yet, so the hero never renders empty.
  const slides =
    banners && banners.length > 0
      ? banners.map((b) => ({
          eyebrow: b.eyebrow ?? '',
          heading: b.title,
          subtext: b.subtitle ?? '',
          image: b.image,
          ctaText: b.cta_text || 'Shop now',
          ctaLink: b.cta_link || ROUTES.PRODUCTS,
          secondaryCtaText: b.secondary_cta_text || 'Explore categories',
          secondaryCtaLink: b.secondary_cta_link || '#categories',
        }))
      : HERO_SLIDES.map((s) => ({
          ...s,
          image: heroBanner,
          ctaText: 'Shop now',
          ctaLink: ROUTES.PRODUCTS,
          secondaryCtaText: 'Explore categories',
          secondaryCtaLink: '#categories',
        }))

  useEffect(() => {
    if (reducedMotion) return
    const id = setInterval(() => {
      setActiveSlide((s) => (s + 1) % slides.length)
    }, 6000)
    return () => clearInterval(id)
  }, [reducedMotion, slides.length])
  const { data: featured, isLoading: featuredLoading, error: featuredError, refetch } = useFeaturedProducts()
  const { data: categoryTree, isLoading: categoriesLoading } = useCategoryTree()

  const currentSlide = slides[activeSlide] ?? slides[0]!
  const featuredProducts = featured?.results ?? []
  // Flatten to the categories products actually belong to: leaf children
  // when present, otherwise the root itself.
  const displayCategories = (categoryTree ?? []).flatMap((root) =>
    root.children && root.children.length > 0 ? root.children : [root]
  )

  return (
    <>
      <Helmet>
        <title>{`${env.VITE_APP_NAME} — Premium Store`}</title>
        <meta name="description" content="Discover premium quality goods, thoughtfully curated for the modern life." />
        <meta property="og:title" content={`${env.VITE_APP_NAME} — Premium Store`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: env.VITE_APP_NAME,
          url: (import.meta.env.VITE_APP_URL as string | undefined) ?? 'https://shopcore.com',
          logo: '/logo.svg',
        })}</script>
      </Helmet>

      {/* Hero */}
      <section aria-label="Hero" className="relative min-h-[420px] overflow-hidden rounded-none bg-bg-subtle md:mx-4 md:mt-4 md:min-h-[600px] md:rounded-[28px] lg:mx-8 lg:mt-6">
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          <img
            key={currentSlide.image}
            src={currentSlide.image}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-subtle via-bg-subtle/60 to-transparent md:from-bg-subtle md:via-bg-subtle/40 md:to-transparent" />
        </div>

        <PageContainer className="relative flex min-h-[420px] flex-col justify-center py-16 md:min-h-[600px]">
          <div className="max-w-xl" aria-live="polite" aria-atomic="true">
            <motion.p
              key={`eyebrow-${activeSlide}`}
              {...fadeUp(reducedMotion)}
              className="text-caption font-semibold uppercase tracking-widest text-tw-accent"
            >
              {currentSlide.eyebrow}
            </motion.p>
            <motion.h1
              key={`heading-${activeSlide}`}
              {...fadeUp(reducedMotion)}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mt-4 font-semibold text-text-primary text-balance"
              style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', lineHeight: 1.1 }}
            >
              {currentSlide.heading}
            </motion.h1>
            <motion.p
              key={`subtext-${activeSlide}`}
              {...fadeUp(reducedMotion)}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-5 text-body-lg text-text-secondary"
            >
              {currentSlide.subtext}
            </motion.p>
            <motion.div
              {...fadeUp(reducedMotion)}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button size="lg" asChild>
                <Link to={currentSlide.ctaLink}>
                  {currentSlide.ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to={currentSlide.secondaryCtaLink}>{currentSlide.secondaryCtaText}</Link>
              </Button>
            </motion.div>
          </div>
        </PageContainer>

        {/* Carousel controls */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => setActiveSlide((s) => (s - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-primary shadow-sm transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:shadow-focus-ring sm:flex md:left-6"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => setActiveSlide((s) => (s + 1) % slides.length)}
          className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-primary shadow-sm transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:shadow-focus-ring sm:flex md:right-6"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 md:bottom-6">
          {Array.from({ length: slides.length }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setActiveSlide(i)}
              className={cn(
                'h-2.5 w-2.5 rounded-full border transition-colors',
                i === activeSlide
                  ? 'border-white bg-white'
                  : 'border-white/50 bg-white/30'
              )}
            />
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section aria-label="Features" className="border-y border-border bg-bg">
        <PageContainer>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 py-6">
            {[
              { icon: Truck, title: 'Free shipping', desc: 'On orders over $100' },
              { icon: RefreshCw, title: 'Easy returns', desc: '30-day return policy' },
              { icon: ShieldCheck, title: 'Secure payment', desc: '100% secure checkout' },
              { icon: Headphones, title: '24/7 support', desc: 'Dedicated support' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4 py-4 sm:justify-center sm:px-6">
                <Icon className="h-6 w-6 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="text-body-sm font-semibold text-text-primary">{title}</p>
                  <p className="text-caption text-text-tertiary">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Categories */}
      <section id="categories" aria-labelledby="categories-heading" className="section-spacing !py-12">
        <PageContainer>
          {categoriesLoading ? (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-8">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-3 w-12 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-y-6 gap-x-2 sm:grid-cols-4 md:grid-cols-8">
              {displayCategories.slice(0, 8).map((cat) => {
                const Icon = getCategoryIcon(cat.slug)
                return (
                  <Link
                    key={cat.id}
                    to={buildRoute.category(cat.slug)}
                    className="group flex flex-col items-center gap-2.5 rounded-lg p-2 text-center focus-visible:outline-none focus-visible:shadow-focus-ring"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-subtle text-text-secondary transition-colors group-hover:bg-accent-subtle group-hover:text-accent">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-caption font-medium text-text-primary line-clamp-1">
                      {cat.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </PageContainer>
      </section>

      {/* Featured products */}
      <section aria-labelledby="featured-heading" className="section-spacing !pt-0 bg-bg-subtle">
        <PageContainer>
          <div className="flex flex-col gap-4 border-t border-border pt-12 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="featured-heading" className="text-heading-xl font-semibold text-text-primary">
              Featured products
            </h2>
            <div className="flex items-center gap-1 rounded-full bg-bg p-1">
              {FEATURED_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-body-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <Link
              to={ROUTES.PRODUCTS}
              className="flex items-center gap-1 text-body-sm font-medium text-accent hover:underline focus-visible:outline-none"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-8">
            {featuredError ? (
              <ErrorState onRetry={() => { void refetch() }} />
            ) : featuredProducts.length === 0 && !featuredLoading ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface py-16 text-center">
                <p className="text-body-md text-text-secondary">No featured products yet.</p>
                <Link
                  to={ROUTES.PRODUCTS}
                  className="flex items-center gap-1 text-body-sm font-medium text-accent hover:underline focus-visible:outline-none"
                >
                  Browse all products <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <ProductGrid
                products={featuredProducts}
                isLoading={featuredLoading}
                skeletonCount={8}
              />
            )}
          </div>
        </PageContainer>
      </section>
    </>
  )
}
