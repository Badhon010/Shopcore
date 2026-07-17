import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { formatDate } from '@/utils/formatDate'

// Legal boilerplate — review with legal counsel before publishing.
export function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service — ShopCore</title>
        <meta name="description" content="ShopCore Terms of Service." />
      </Helmet>
      <PageContainer className="py-12 max-w-3xl">
        <h1 className="text-heading-xl font-semibold text-text-primary">Terms of Service</h1>
        <p className="mt-2 text-body-sm text-text-tertiary">
          Last updated: {formatDate(new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="mt-8 space-y-6 text-body-md text-text-secondary prose prose-sm max-w-none">
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">1. Acceptance of Terms</h2>
            <p>By accessing or using ShopCore, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">2. Use of Service</h2>
            <p>You may use our services only for lawful purposes and in accordance with these terms. You agree not to use our services in any way that violates applicable laws or regulations.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">3. Products and Pricing</h2>
            <p>We reserve the right to modify or discontinue products and to change prices at any time without notice. We are not liable to you or any third party for any modification, suspension, or discontinuation of products.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">4. Orders and Payment</h2>
            <p>By placing an order, you represent that you are authorized to use the payment method provided. We reserve the right to refuse or cancel orders at our discretion.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">5. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ShopCore shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.</p>
          </section>
          <section>
            <h2 className="text-heading-sm font-semibold text-text-primary">6. Contact</h2>
            <p>Questions about these terms may be sent to <a href="mailto:legal@shopcore.com" className="text-accent hover:underline">legal@shopcore.com</a>.</p>
          </section>
        </div>
      </PageContainer>
    </>
  )
}
