import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Helmet } from 'react-helmet-async'
import { PageContainer } from '@/components/layout/PageContainer'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { emailSchema } from '@/utils/validators'
import { APP_CONFIG } from '@/constants/config'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: emailSchema,
  subject: z.string().min(1, 'Required'),
  message: z.string().min(10, 'Please provide more detail'),
})
type FormData = z.infer<typeof schema>

export function ContactPage() {
  const form = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = (data: FormData) => {
    // CONTRACT-ASSUMPTION: If a backend contact endpoint (/api/contact/) exists, POST to it.
    // Falling back to mailto since no contact endpoint is assumed in the spec.
    // To enable backend: replace this with: await axiosClient.post(endpoints.contact.submit(), data)
    const mailtoUrl = `mailto:${APP_CONFIG.contactEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(`Name: ${data.name}\n\n${data.message}`)}`
    window.location.href = mailtoUrl
  }

  return (
    <>
      <Helmet>
        <title>Contact Us — ShopCore</title>
        <meta name="description" content="Get in touch with the ShopCore team." />
      </Helmet>
      <PageContainer className="py-12 max-w-xl">
        <h1 className="text-heading-xl font-semibold text-text-primary">Contact us</h1>
        <p className="mt-2 text-body-md text-text-secondary">
          Questions or feedback? We&apos;d love to hear from you.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
          <FormField label="Name" required error={form.formState.errors.name?.message}>
            {(id) => <Input id={id} {...form.register('name')} error={!!form.formState.errors.name} />}
          </FormField>
          <FormField label="Email" required error={form.formState.errors.email?.message}>
            {(id) => <Input id={id} type="email" {...form.register('email')} error={!!form.formState.errors.email} />}
          </FormField>
          <FormField label="Subject" required error={form.formState.errors.subject?.message}>
            {(id) => <Input id={id} {...form.register('subject')} error={!!form.formState.errors.subject} />}
          </FormField>
          <FormField label="Message" required error={form.formState.errors.message?.message}>
            {(id, errorId) => (
              <Textarea
                id={id}
                rows={5}
                errorId={errorId}
                error={!!form.formState.errors.message}
                {...form.register('message')}
              />
            )}
          </FormField>
          <Button type="submit" className="w-full sm:w-auto">Send message</Button>
        </form>
      </PageContainer>
    </>
  )
}
