import { Link } from 'react-router-dom'
import { Instagram, Twitter, Facebook } from 'lucide-react'
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

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-subtle" aria-label="Site footer">
      <div className="container-page py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to={ROUTES.HOME} className="text-heading-sm font-semibold text-text-primary">
              ShopCore
            </Link>
            <p className="mt-3 max-w-xs text-body-sm text-text-secondary">
              Premium quality goods, thoughtfully curated for the modern life.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href={APP_CONFIG.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rounded-md p-1.5 text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={APP_CONFIG.socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="rounded-md p-1.5 text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href={APP_CONFIG.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="rounded-md p-1.5 text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring"
              >
                <Facebook className="h-4 w-4" />
              </a>
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
          <div className="flex items-center gap-2 text-caption text-text-tertiary">
            <span>Visa</span>
            <span>·</span>
            <span>Mastercard</span>
            <span>·</span>
            <span>PayPal</span>
            <span>·</span>
            <span>Apple Pay</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
