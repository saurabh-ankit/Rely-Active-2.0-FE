import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fnbService } from '@/lib/services/fnbService'
import type { FnbFoodPackage, FnbPropertyMealSlot, FnbDish } from '@/lib/types/fnb'

export const FNB_KEYS = {
  all: ['fnb'] as const,
  packages: (locId: string) => ['fnb', 'packages', locId] as const,
  mealSlots: (locId: string) => ['fnb', 'mealSlots', locId] as const,
  globalMealSlots: () => ['fnb', 'globalMealSlots'] as const,
  specialSlots: (locId: string) => ['fnb', 'specialSlots', locId] as const,
  dishes: (locId: string) => ['fnb', 'dishes', locId] as const,
  dailyMenu: (locId: string, date: string) => ['fnb', 'dailyMenu', locId, date] as const,
  residentOrders: (locId: string, filters?: Record<string, string>) =>
    ['fnb', 'residentOrders', locId, filters] as const,
  staffEmployees: (locId: string) => ['fnb', 'staffEmployees', locId] as const,
}

// ==================== Queries ====================
export const useFnbPackagesQuery = (locId: string) => {
  return useQuery({
    queryKey: FNB_KEYS.packages(locId),
    queryFn: () => fnbService.getPackages(locId),
    enabled: Boolean(locId),
  })
}

export const useFnbMealSlotsQuery = (locId: string) => {
  return useQuery({
    queryKey: FNB_KEYS.mealSlots(locId),
    queryFn: () => fnbService.getMealSlots(locId),
    enabled: Boolean(locId),
  })
}

export const useFnbSpecialSlotsQuery = (locId: string) => {
  return useQuery({
    queryKey: FNB_KEYS.specialSlots(locId),
    queryFn: () => fnbService.getSpecialSlots(locId),
    enabled: Boolean(locId),
  })
}

export const useFnbDishesQuery = (locId: string) => {
  return useQuery({
    queryKey: FNB_KEYS.dishes(locId),
    queryFn: () => fnbService.getDishes(locId),
    enabled: Boolean(locId),
  })
}

export const useFnbDailyMenuQuery = (locId: string, date: string) => {
  return useQuery({
    queryKey: FNB_KEYS.dailyMenu(locId, date),
    queryFn: () => fnbService.getDailyMenu(locId, date),
    enabled: Boolean(locId && date),
  })
}

export const useFnbResidentOrdersQuery = (locId: string, filters?: Record<string, string>) => {
  return useQuery({
    queryKey: FNB_KEYS.residentOrders(locId, filters),
    queryFn: () => fnbService.getResidentOrders(locId, filters),
    enabled: Boolean(locId),
  })
}

export const useFnbStaffEmployeesQuery = (locId: string) => {
  return useQuery({
    queryKey: FNB_KEYS.staffEmployees(locId),
    queryFn: () => fnbService.getStaffEmployees(locId),
    enabled: Boolean(locId),
  })
}

// ==================== Mutations ====================
export const useUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, orderStatus }: { id: string; orderStatus: string }) =>
      fnbService.updateOrderStatus(id, orderStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FNB_KEYS.all })
    },
  })
}

export const useAssignDeliveryMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, employeeId, deliveryCharge }: { id: string; employeeId: string; deliveryCharge?: number }) =>
      fnbService.assignDeliveryEmployee(id, { employeeId, deliveryCharge }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FNB_KEYS.all })
    },
  })
}

export const useCompleteDeliveryMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, photoUrl }: { id: string; photoUrl?: string }) => fnbService.completeDelivery(id, { photoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FNB_KEYS.all })
    },
  })
}

export const useCreatePackageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<FnbFoodPackage>) => fnbService.createPackage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FNB_KEYS.all })
    },
  })
}

export const useCreateMealSlotMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<FnbPropertyMealSlot>) => fnbService.createMealSlot(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FNB_KEYS.all })
    },
  })
}

export const useCreateDishMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<FnbDish>) => fnbService.createDish(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FNB_KEYS.all })
    },
  })
}

export const usePublishDailyMenuMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof fnbService.publishDailyMenu>[0]) => fnbService.publishDailyMenu(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FNB_KEYS.all })
    },
  })
}
