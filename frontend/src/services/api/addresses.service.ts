import { axiosClient } from './axiosClient'
import { endpoints } from './endpoints'
import type { Address } from '@/types/models'

export type AddressPayload = Omit<Address, 'id'>

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
