import { Helmet } from 'react-helmet-async'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'

export function ResetPasswordPage() {
  return (
    <>
      <Helmet>
        <title>Set New Password — ShopCore</title>
      </Helmet>
      <ResetPasswordForm />
    </>
  )
}
