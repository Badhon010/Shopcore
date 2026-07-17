import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { Accordion } from '@/components/ui/Accordion'

const FAQS = [
  { q: 'How long does shipping take?', a: 'Standard shipping takes 5–7 business days. Express shipping (2–3 business days) is available at checkout for an additional fee. Free standard shipping on all orders over $50.' },
  { q: 'What is your return policy?', a: 'We offer free returns within 30 days of delivery. Items must be in their original, unworn condition with all tags attached. To start a return, go to your orders page and select "Return item".' },
  { q: 'Do you ship internationally?', a: 'Yes, we ship to over 50 countries. International shipping rates and delivery times are calculated at checkout.' },
  { q: 'How do I track my order?', a: 'Once your order ships, you\'ll receive a tracking email. You can also track your order on our Track Order page using your order number and email.' },
  { q: 'Can I change or cancel my order?', a: 'Orders can be modified or cancelled within 1 hour of placement. After that, they enter fulfillment and cannot be changed. Contact us immediately if you need to make changes.' },
  { q: 'Are your products sustainably sourced?', a: 'We work hard to ensure our supply chain is ethical and sustainable. We look for suppliers who share our values around fair labor practices and environmental responsibility.' },
  { q: 'How do I care for my products?', a: 'Care instructions are listed on each product page and are printed on the product\'s label. When in doubt, follow the label.' },
]

export function FaqPage() {
  return (
    <>
      <Helmet>
        <title>FAQ — ShopCore</title>
        <meta name="description" content="Frequently asked questions about ShopCore." />
      </Helmet>
      <PageContainer className="py-12 max-w-2xl">
        <h1 className="text-heading-xl font-semibold text-text-primary">Frequently Asked Questions</h1>
        <div className="mt-8">
          <Accordion
            type="single"
            items={FAQS.map((faq, i) => ({
              value: `faq-${i}`,
              trigger: faq.q,
              content: faq.a,
            }))}
          />
        </div>
      </PageContainer>
    </>
  )
}
