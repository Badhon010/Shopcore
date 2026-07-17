import { Helmet } from 'react-helmet-async'
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'

export function ForgotPasswordPage() {
  return (
    <>
      <Helmet>
        <title>Reset Password — ShopCore</title>
      </Helmet>
      <ForgotPasswordForm />
    </>
  )
}
