import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { CheckCircle, XCircle } from 'lucide-react'
import { authService } from '@/services/api/auth.service'
import { Spinner } from '@/components/feedback/Spinner'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'

export function VerifyEmailPage() {
  const { uid = '', token = '' } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const verify = useMutation({
    mutationFn: () => authService.verifyEmail({ uid, token }),
    onSuccess: () => setStatus('success'),
    onError: () => setStatus('error'),
  })

  useEffect(() => {
    if (uid && token) verify.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, token])

  return (
    <>
      <Helmet>
        <title>Verify Email — ShopCore</title>
      </Helmet>
      <div className="text-center">
        {verify.isPending && (
          <>
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-body-md text-text-secondary">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-7 w-7 text-success" />
            </div>
            <h1 className="text-heading-md font-semibold text-text-primary">Email verified!</h1>
            <p className="mt-2 text-body-sm text-text-secondary">Your email has been successfully verified.</p>
            <Button className="mt-6" onClick={() => navigate(ROUTES.ACCOUNT)}>
              Go to my account
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-subtle">
              <XCircle className="h-7 w-7 text-danger" />
            </div>
            <h1 className="text-heading-md font-semibold text-text-primary">Verification failed</h1>
            <p className="mt-2 text-body-sm text-text-secondary">
              The verification link is invalid or has expired.
            </p>
            <Button className="mt-6" variant="ghost" onClick={() => navigate(ROUTES.LOGIN)}>
              Back to sign in
            </Button>
          </>
        )}
      </div>
    </>
  )
}
