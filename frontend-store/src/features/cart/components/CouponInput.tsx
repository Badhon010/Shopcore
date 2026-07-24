import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useApplyCoupon, useRemoveCoupon } from '../hooks/useCart'
import type { Cart } from '@/types/models'

interface CouponInputProps {
  cart: Cart
}

export function CouponInput({ cart }: CouponInputProps) {
  const [code, setCode] = useState('')
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-3 py-2">
        <div>
          <p className="text-body-sm font-medium text-success">{cart.coupon.code}</p>
          {cart.coupon.description && (
            <p className="text-caption text-text-secondary">{cart.coupon.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => remove.mutate()}
          isLoading={remove.isPending}
          aria-label="Remove coupon"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (code.trim()) apply.mutate(code.trim())
      }}
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Coupon code"
        className="flex-1"
        aria-label="Coupon code"
      />
      <Button
        type="submit"
        variant="secondary"
        isLoading={apply.isPending}
        disabled={!code.trim()}
      >
        Apply
      </Button>
    </form>
  )
}
