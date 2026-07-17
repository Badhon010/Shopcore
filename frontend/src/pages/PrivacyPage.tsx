import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { formatDate } from '@/utils/formatDate'

// Privacy policy boilerplate — review with legal counsel before publishing.
export function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — ShopCore</title>
        <meta name="description" content="ShopCore Privacy Policy." />
      </Helmet>
      <PageContainer className="py-12 max-w-3xl">
        <h1 className="text-heading-xl font-semibold text-text-primary">Privacy Policy</h1>
        <p className="mt-2 text-body-sm text-text-tertiary">
          Last updated: {formatDate(new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="mt-8 space-y-6 text-body-md text-text-secondary prose prose-sm max-w-none">
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">1. Information We Collect</h2>
            <p>We collect information you provide directly (name, email, address) and usage data automatically (page views, cart activity). We do not sell your personal data.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">2. How We Use Your Information</h2>
            <p>We use your information to process orders, provide customer support, send transactional emails, and improve our service. We do not share your personal data with third parties except as necessary to fulfill your orders.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">3. Cookies</h2>
            <p>We use cookies for session management and to remember your preferences. You can disable cookies in your browser settings, though some features may not work properly.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">4. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:privacy@shopcore.com" className="text-accent hover:underline">privacy@shopcore.com</a>.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">5. Security</h2>
            <p>We use industry-standard SSL encryption for all data transmissions. Access tokens are stored in memory only and are never written to local storage.</p>
          </section>
        </div>
      </PageContainer>
    </>
  )
}
