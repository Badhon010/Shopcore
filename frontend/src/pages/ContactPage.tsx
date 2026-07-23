import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Helmet } from 'react-helmet-async'
import { Mail, Phone, MapPin, Twitter, Instagram, Facebook, CheckCircle2, Send } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { emailSchema } from '@/utils/validators'
import { APP_CONFIG } from '@/constants/config'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: emailSchema,
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Please provide a bit more detail (at least 10 characters)'),
})
type FormData = z.infer<typeof schema>

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'Email us',
    value: APP_CONFIG.contactEmail,
    detail: 'We reply within one business day',
    bg: 'bg-primary-light',
    color: 'text-primary',
  },
  {
    icon: Phone,
    label: 'Call us',
    value: '+1 (800) 555-0199',
    detail: 'Mon – Fri, 9 am – 6 pm EST',
    bg: 'bg-info-subtle',
    color: 'text-info',
  },
  {
    icon: MapPin,
    label: 'Headquartered in',
    value: 'Remote-first',
    detail: 'Team spread across 8 time zones',
    bg: 'bg-success-subtle',
    color: 'text-success',
  },
]

const SOCIALS = [
  { icon: Twitter, href: APP_CONFIG.socials.twitter, label: 'Twitter / X' },
  { icon: Instagram, href: APP_CONFIG.socials.instagram, label: 'Instagram' },
  { icon: Facebook, href: APP_CONFIG.socials.facebook, label: 'Facebook' },
]

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const successRef = useRef<HTMLDivElement>(null)
  const form = useForm<FormData>({ resolver: zodResolver(schema) })

  // Shift focus into the success state so screen readers announce it
  useEffect(() => {
    if (submitted) {
      successRef.current?.focus()
    }
  }, [submitted])

  const onSubmit = (data: FormData) => {
    const mailtoUrl = `mailto:${APP_CONFIG.contactEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(`Name: ${data.name}\n\n${data.message}`)}`
    window.location.href = mailtoUrl
    setSubmitted(true)
  }

  return (
    <>
      <Helmet>
        <title>Contact Us — ShopCore</title>
        <meta name="description" content="Get in touch with the ShopCore team. We'd love to hear from you." />
      </Helmet>

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="bg-background-subtle border-b border-border">
        <PageContainer className="py-12 md:py-16">
          <span className="text-overline font-semibold uppercase tracking-widest text-primary">
            Contact
          </span>
          <h1 className="mt-3 text-heading-xl font-bold text-text-primary">
            We'd love to hear from you
          </h1>
          <p className="mt-3 text-body-lg text-text-secondary max-w-xl">
            Whether you have a question about an order, a product, or just want to say hello —
            reach out and we'll get back to you promptly.
          </p>
        </PageContainer>
      </div>

      <PageContainer className="py-10 md:py-14">
        <div className="grid lg:grid-cols-5 gap-12">

          {/* ── Left column: contact info ───────────────────── */}
          <aside className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              {CONTACT_INFO.map(({ icon: Icon, label, value, detail, bg, color }) => (
                <div
                  key={label}
                  className="flex gap-4 items-start rounded-xl p-4 bg-surface border border-border shadow-xs"
                >
                  <span className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </span>
                  <div>
                    <p className="text-label font-semibold text-text-primary">{label}</p>
                    <p className="text-body-sm text-text-primary font-medium">{value}</p>
                    <p className="text-caption text-text-muted mt-0.5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social links */}
            <div className="rounded-xl p-5 bg-surface border border-border shadow-xs">
              <p className="text-label font-semibold text-text-primary mb-4">Find us on social</p>
              <div className="flex gap-3">
                {SOCIALS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary hover:bg-secondary-hover border border-border transition-colors"
                    style={{ transitionDuration: 'var(--duration-base)' }}
                  >
                    <Icon className="h-4 w-4 text-text-secondary" />
                  </a>
                ))}
              </div>
            </div>

            {/* Response time note */}
            <div className="rounded-xl p-5 bg-primary-light border border-primary/20">
              <p className="text-body-sm text-text-primary font-medium">
                ⚡ Average response time
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                Our team typically replies within 4 hours during business hours,
                and by the next morning for messages sent in the evening.
              </p>
            </div>
          </aside>

          {/* ── Right column: form ───────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="rounded-xl bg-surface-elevated border border-border shadow-md p-8">
              {submitted ? (
                /* Success state */
                <div
                  ref={successRef}
                  role="status"
                  tabIndex={-1}
                  className="flex flex-col items-center text-center gap-4 py-10 focus-visible:outline-none"
                >
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </span>
                  <h2 className="text-heading-md font-semibold text-text-primary">Message sent!</h2>
                  <p className="text-body-md text-text-secondary max-w-sm">
                    Your email client should have opened. We'll reply to <strong>{form.getValues('email')}</strong> as soon as possible.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => { setSubmitted(false); form.reset() }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                /* Form */
                <>
                  <h2 className="text-heading-md font-semibold text-text-primary mb-6">
                    Send a message
                  </h2>

                  <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField label="Your name" required error={form.formState.errors.name?.message}>
                        {(id) => (
                          <Input
                            id={id}
                            placeholder="Jane Smith"
                            {...form.register('name')}
                            error={!!form.formState.errors.name}
                          />
                        )}
                      </FormField>

                      <FormField label="Email address" required error={form.formState.errors.email?.message}>
                        {(id) => (
                          <Input
                            id={id}
                            type="email"
                            placeholder="jane@example.com"
                            {...form.register('email')}
                            error={!!form.formState.errors.email}
                          />
                        )}
                      </FormField>
                    </div>

                    <FormField label="Subject" required error={form.formState.errors.subject?.message}>
                      {(id) => (
                        <Input
                          id={id}
                          placeholder="What's this about?"
                          {...form.register('subject')}
                          error={!!form.formState.errors.subject}
                        />
                      )}
                    </FormField>

                    <FormField label="Message" required error={form.formState.errors.message?.message}>
                      {(id, errorId) => (
                        <Textarea
                          id={id}
                          rows={6}
                          placeholder="Tell us as much or as little as you'd like…"
                          errorId={errorId}
                          error={!!form.formState.errors.message}
                          {...form.register('message')}
                        />
                      )}
                    </FormField>

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <p className="text-caption text-text-muted">
                        By submitting, your message opens in your email client.
                      </p>
                      <Button
                        type="submit"
                        size="lg"
                        isLoading={form.formState.isSubmitting}
                        loadingText="Sending…"
                        className="shrink-0 inline-flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Send message
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  )
}
