import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Address } from '@/types/models'

// Omit server-generated read-only fields; the rest maps 1-to-1 to the serializer.
export type AddressPayload = Omit<Address, 'id' | 'created_at' | 'updated_at'>

export const addressesService = {
  getAddresses: ({ signal }: { signal?: AbortSignal } = {}) =>
    axiosClient
      .get<Address[]>(endpoints.addresses.list(), { signal })
      .then((r) => r.data),

  createAddress: (payload: AddressPayload) =>
    axiosClient
      .post<Address>(endpoints.addresses.list(), payload)
      .then((r) => r.data),

  updateAddress: (id: string, payload: Partial<AddressPayload>) =>
    axiosClient
      .patch<Address>(endpoints.addresses.detail(id), payload)
      .then((r) => r.data),

  deleteAddress: (id: string) =>
    axiosClient
      .delete(endpoints.addresses.detail(id))
      .then((r) => r.data),

  setDefault: (id: string) =>
    axiosClient
      .post<Address>(endpoints.addresses.setDefault(id))
      .then((r) => r.data),
}
