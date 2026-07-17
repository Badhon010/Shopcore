import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileService, type ProfilePayload } from '@/services/api/profile.service'
import { addressesService, type AddressPayload } from '@/services/api/addresses.service'
import { queryKeys } from '@/services/queryKeys'
import { useToast } from '@/contexts/ToastContext'
import { notificationsService } from '@/services/api/notifications.service'

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: ({ signal }) => profileService.getProfile({ signal }),
    staleTime: 0,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (payload: ProfilePayload) => profileService.updateProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile.detail(), data)
      queryClient.setQueryData(queryKeys.auth.me(), data)
      toast({ title: 'Profile updated', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Could not update profile', variant: 'error' })
    },
  })
}

export function useAddresses() {
  return useQuery({
    queryKey: queryKeys.addresses.list(),
    queryFn: ({ signal }) => addressesService.getAddresses({ signal }),
  })
}

export function useCreateAddress() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (payload: AddressPayload) => addressesService.createAddress(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses.list() })
      toast({ title: 'Address added', variant: 'success' })
    },
  })
}

export function useUpdateAddress() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AddressPayload> }) =>
      addressesService.updateAddress(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses.list() })
      toast({ title: 'Address updated', variant: 'success' })
    },
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => addressesService.deleteAddress(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses.list() })
      toast({ title: 'Address removed', variant: 'success' })
    },
  })
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: queryKeys.notifications.list({ page }),
    queryFn: ({ signal }) => notificationsService.getNotifications({ page }, { signal }),
    staleTime: 0,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
