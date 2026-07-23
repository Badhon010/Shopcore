import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Instagram, Twitter, Facebook, ArrowRight } from 'lucide-react'
import { APP_CONFIG } from '@/constants/config'
import { ROUTES } from '@/constants/routes'

const shopLinks = [
  { label: 'All Products', href: ROUTES.PRODUCTS },
  { label: 'New Arrivals', href: `${ROUTES.PRODUCTS}?ordering=-created_at` },
  { label: 'Best Sellers', href: `${ROUTES.PRODUCTS}?ordering=-sales` },
  { label: 'Track Order', href: ROUTES.TRACK_ORDER },
]

const companyLinks = [
  { label: 'About Us', href: ROUTES.ABOUT },
  { label: 'Contact', href: ROUTES.CONTACT },
  { label: 'FAQ', href: ROUTES.FAQ },
]

const legalLinks = [
  { label: 'Terms of Service', href: ROUTES.TERMS },
  { label: 'Privacy Policy', href: ROUTES.PRIVACY },
]

const PAYMENT_METHODS = ['Visa', 'Mastercard', 'PayPal', 'Apple Pay']

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setEmail('')
    }
  }

  return (
    <footer className="border-t border-border bg-bg-subtle" aria-label="Site footer">
      <div className="container-page py-12 md:py-16">

        {/* Newsletter strip */}
        <div className="mb-12 flex flex-col gap-4 rounded-xl border border-border bg-surface px-6 py-6 shadow-xs sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div>
            <p className="text-heading-sm font-semibold text-text-primary">Stay in the loop</p>
            <p className="mt-1 text-body-sm text-text-secondary">
              New arrivals, exclusive offers, and maker stories — straight to your inbox.
            </p>
          </div>
          {subscribed ? (
            <p className="shrink-0 text-body-sm font-medium text-success">
              ✓ You're subscribed!
            </p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex w-full max-w-sm gap-2 shrink-0">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:shadow-focus-ring"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-body-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:shadow-focus-ring"
              >
                Subscribe <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to={ROUTES.HOME} className="text-heading-sm font-semibold text-text-primary">
              ShopCore
            </Link>
            <p className="mt-3 max-w-xs text-body-sm text-text-secondary">
              Premium quality goods, thoughtfully curated for the modern life.
            </p>
            <div className="mt-4 flex gap-2">
              {[
                { href: APP_CONFIG.socials.instagram, Icon: Instagram, label: 'Instagram' },
                { href: APP_CONFIG.socials.twitter, Icon: Twitter, label: 'Twitter' },
                { href: APP_CONFIG.socials.facebook, Icon: Facebook, label: 'Facebook' },
              ].map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-text-tertiary transition-colors hover:border-border-strong hover:bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-caption font-semibold uppercase tracking-widest text-text-tertiary">
              Shop
            </h3>
            <ul className="mt-4 space-y-3">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-body-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-caption font-semibold uppercase tracking-widest text-text-tertiary">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-body-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-caption font-semibold uppercase tracking-widest text-text-tertiary">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-body-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-caption text-text-tertiary">
            © {new Date().getFullYear()} ShopCore. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method}
                className="rounded border border-border bg-surface px-2 py-0.5 text-caption font-medium text-text-muted"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
