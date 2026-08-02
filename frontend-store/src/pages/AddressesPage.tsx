import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/feedback/Spinner'
import { EmptyState } from '@/components/feedback/EmptyState'
import { AddressForm } from '@/features/account/components/AddressForm'
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress } from '@/features/account/hooks/useProfile'
import type { Address } from '@/types/models'

export function AddressesPage() {
  const { data: addresses, isLoading } = useAddresses()
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const deleteAddress = useDeleteAddress()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editAddress, setEditAddress] = useState<Address | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <>
      <Helmet>
        <title>My Addresses — ShopCore</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-heading-lg font-semibold text-text-primary">My Addresses</h1>
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add address
          </Button>
        </div>

        {!addresses?.length ? (
          <EmptyState
            icon={<MapPin className="h-8 w-8" />}
            title="No saved addresses"
            description="Save addresses for faster checkout."
            action={{ label: 'Add address', onClick: () => setAddModalOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-body-sm font-semibold text-text-primary">
                      {addr.full_name}
                      {addr.is_default && <Badge variant="accent" className="ml-2">Default</Badge>}
                    </p>
                    <address className="not-italic mt-1 text-body-sm text-text-secondary space-y-0.5">
                      <p>{addr.address_line_1}</p>
                      {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                      <p>{addr.city}, {addr.state_province} {addr.postal_code}</p>
                      <p>{addr.country}</p>
                    </address>
                  </div>
                  <div className="flex gap-1">
                    <IconButton label="Edit address" size="sm" onClick={() => setEditAddress(addr)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton label="Delete address" size="sm" className="text-danger hover:bg-danger-subtle" onClick={() => setDeleteId(addr.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add address" size="lg">
        <AddressForm
          onSubmit={async (data) => {
            await createAddress.mutateAsync(data)
            setAddModalOpen(false)
          }}
          isSubmitting={createAddress.isPending}
        />
      </Modal>

      <Modal open={!!editAddress} onClose={() => setEditAddress(null)} title="Edit address" size="lg">
        {editAddress && (
          <AddressForm
            defaultValues={editAddress}
            onSubmit={async (data) => {
              await updateAddress.mutateAsync({ id: editAddress.id, payload: data })
              setEditAddress(null)
            }}
            isSubmitting={updateAddress.isPending}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete address" description="Are you sure you want to delete this address?">
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button
            variant="destructive"
            isLoading={deleteAddress.isPending}
            onClick={async () => {
              if (deleteId) {
                await deleteAddress.mutateAsync(deleteId)
                setDeleteId(null)
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )
}
