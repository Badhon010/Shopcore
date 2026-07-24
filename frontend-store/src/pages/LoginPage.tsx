import { Helmet } from 'react-helmet-async'
import { LoginForm } from '@/features/auth/components/LoginForm'

export function LoginPage() {
  return (
    <>
      <Helmet>
        <title>Sign In — ShopCore</title>
      </Helmet>
      <LoginForm />
    </>
  )
}
