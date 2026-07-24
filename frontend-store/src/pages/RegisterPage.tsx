import { Helmet } from 'react-helmet-async'
import { RegisterForm } from '@/features/auth/components/RegisterForm'

export function RegisterPage() {
  return (
    <>
      <Helmet>
        <title>Create Account — ShopCore</title>
      </Helmet>
      <RegisterForm />
    </>
  )
}
