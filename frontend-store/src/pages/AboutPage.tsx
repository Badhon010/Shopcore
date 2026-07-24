import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Leaf,
  Globe,
  ShieldCheck,
  Users,
  ArrowRight,
  Package,
  HeartHandshake,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'

/* ─── Static data ────────────────────────────────────────────── */
const STATS = [
  { value: '12 K+', label: 'Happy customers' },
  { value: '340+', label: 'Curated products' },
  { value: '50+', label: 'Countries shipped to' },
  { value: '98%', label: 'Satisfaction rate' },
]

const VALUES = [
  {
    icon: Leaf,
    title: 'Sustainability first',
    body: 'We evaluate every supplier against strict environmental and ethical sourcing criteria before a single product enters our catalogue.',
    bg: 'bg-success-subtle',
    iconColor: 'text-success',
  },
  {
    icon: ShieldCheck,
    title: 'Radical transparency',
    body: 'Material origins, production methods, and pricing are always available. We believe you deserve to know the full story of what you buy.',
    bg: 'bg-info-subtle',
    iconColor: 'text-info',
  },
  {
    icon: HeartHandshake,
    title: 'Maker-first partnerships',
    body: 'We pay fair rates, share honest feedback, and build long-term relationships — not one-off transactions — with every maker we work with.',
    bg: 'bg-warning-subtle',
    iconColor: 'text-warning',
  },
  {
    icon: Globe,
    title: 'Global craft, local care',
    body: "Our team spans eight time zones, but every order is packed by hand and shipped with the same attention you'd expect from a neighbourhood shop.",
    bg: 'bg-primary-light',
    iconColor: 'text-primary',
  },
]

interface TeamMember {
  name: string
  role: string
  initials: string
  image?: string
}

const TEAM: TeamMember[] = [
  { name: 'Mia Tanaka', role: 'Founder & Head of Curation', initials: 'MT' },
  { name: 'Luca Ferreira', role: 'Head of Maker Partnerships', initials: 'LF' },
  { name: 'Amara Osei', role: 'Lead Designer', initials: 'AO' },
  { name: 'Sam Kowalski', role: 'Customer Experience Lead', initials: 'SK' },
]

/* ─── Component ──────────────────────────────────────────────── */
export function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us — ShopCore</title>
        <meta name="description" content="Learn about ShopCore's story, values, and the team behind the curation." />
      </Helmet>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-active)) 100%)' }}
      >
        {/* decorative rings */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full opacity-10"
          style={{ background: 'hsl(var(--primary-foreground))' }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full opacity-10"
          style={{ background: 'hsl(var(--primary-foreground))' }}
        />

        <div className="container-page relative py-24 md:py-32 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-label font-semibold uppercase tracking-widest mb-6"
            style={{ background: 'hsl(var(--primary-foreground)/0.15)', color: 'hsl(var(--primary-foreground))' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Our story
          </span>

          <h1
            className="text-display-xl font-bold text-balance max-w-3xl mx-auto"
            style={{ color: 'hsl(var(--primary-foreground))' }}
          >
            Beautiful things, made with intention
          </h1>

          <p
            className="mt-6 text-body-lg max-w-xl mx-auto"
            style={{ color: 'hsl(var(--primary-foreground)/0.8)' }}
          >
            ShopCore was built on a simple belief: that everyday products should be beautiful,
            durable, and crafted with care — by people paid fairly for their work.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              style={{ background: 'hsl(var(--primary-foreground))', color: 'hsl(var(--primary))', border: 'none' }}
            >
              <Link to={ROUTES.PRODUCTS}>Shop the collection</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              style={{
                color: 'hsl(var(--primary-foreground))',
                border: '1px solid hsl(var(--primary-foreground)/0.3)',
              }}
            >
              <Link to={ROUTES.CONTACT}>Get in touch</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section className="bg-surface border-b border-border shadow-xs">
        <div className="container-page py-10">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="text-display-lg font-bold text-primary">{s.value}</dt>
                <dd className="mt-1 text-body-sm text-text-secondary">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────── */}
      <section className="bg-background-subtle">
        <div className="container-page py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          {/* text */}
          <div>
            <span className="text-overline font-semibold uppercase tracking-widest text-tw-accent">
              Mission
            </span>
            <h2 className="mt-3 text-heading-xl font-bold text-text-primary text-balance">
              Connecting makers with people who value their craft
            </h2>
            <div className="mt-6 space-y-4 text-body-md text-text-secondary">
              <p>
                Every item in our collection is chosen for its quality, thoughtful design, and the story
                behind it. We believe in transparency — in how things are made, where they come from,
                and what they're made of.
              </p>
              <p>
                Based everywhere and nowhere in particular, our small team works remotely to bring you
                the best of global craftsmanship, delivered with genuine care.
              </p>
            </div>
          </div>

          {/* icon grid decoration */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Package, label: 'Curated products', sub: 'Hand-selected for quality' },
              { icon: Globe, label: 'Global reach', sub: 'Shipped to 50+ countries' },
              { icon: Users, label: 'Maker network', sub: '80+ independent artisans' },
              { icon: ShieldCheck, label: 'Quality guarantee', sub: '30-day hassle-free returns' },
            ].map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl p-5 bg-surface shadow-sm border border-border flex flex-col gap-3"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <p className="text-label font-semibold text-text-primary">{label}</p>
                  <p className="mt-0.5 text-caption text-text-muted">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────── */}
      <section className="bg-background">
        <div className="container-page py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-overline font-semibold uppercase tracking-widest text-tw-accent">
              What we stand for
            </span>
            <h2 className="mt-3 text-heading-xl font-bold text-text-primary">Our values</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, body, bg, iconColor }) => (
              <div
                key={title}
                className="rounded-xl p-6 border border-border bg-surface shadow-xs flex flex-col gap-4 hover:shadow-sm transition-shadow"
                style={{ transitionDuration: 'var(--duration-base)' }}
              >
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </span>
                <div>
                  <h3 className="text-heading-sm font-semibold text-text-primary">{title}</h3>
                  <p className="mt-2 text-body-sm text-text-secondary">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────── */}
      <section className="bg-background-subtle border-y border-border">
        <div className="container-page py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-overline font-semibold uppercase tracking-widest text-tw-accent">
              The people
            </span>
            <h2 className="mt-3 text-heading-xl font-bold text-text-primary">Meet the team</h2>
            <p className="mt-4 text-body-md text-text-secondary">
              Small but mighty. Every member of the team is passionate about design, craft, and
              exceptional customer experience.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {TEAM.map((member) => (
              <div key={member.name} className="flex flex-col items-center text-center gap-3">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="h-20 w-20 rounded-full object-cover shadow-sm ring-2 ring-border"
                  />
                ) : (
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center text-heading-md font-bold shadow-sm"
                    aria-label={member.name}
                    style={{
                      background: 'hsl(var(--primary-light))',
                      color: 'hsl(var(--primary))',
                    }}
                  >
                    {member.initials}
                  </div>
                )}
                <div>
                  <p className="text-label font-semibold text-text-primary">{member.name}</p>
                  <p className="mt-0.5 text-caption text-text-muted">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-background">
        <div className="container-page py-20">
          <div
            className="rounded-2xl p-10 md:p-14 text-center shadow-md"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary-light)) 0%, hsl(var(--background-subtle)) 100%)' }}
          >
            <h2 className="text-heading-xl font-bold text-text-primary text-balance">
              Want to know more or partner with us?
            </h2>
            <p className="mt-4 text-body-md text-text-secondary max-w-md mx-auto">
              We love hearing from customers, makers, and curious minds alike. Drop us a message and we'll get back to you within one business day.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to={ROUTES.CONTACT} className="inline-flex items-center gap-2">
                Contact the team <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
