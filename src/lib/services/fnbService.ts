import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  FnbFoodPackage,
  FnbPropertyMealSlot,
  FnbGlobalMealSlot,
  FnbPropertySpecialSlot,
  FnbDish,
  FnbDailyMenu,
  FnbResidentOrder,
  FnbFoodDelivery,
  FnbResidentSubscription,
} from '@/lib/types/fnb'

export const fnbService = {
  // ==================== Packages ====================
  getPackages: async (locId: string): Promise<FnbFoodPackage[]> => {
    const res = await api.get(API_ENDPOINTS.fnb.packages.list(locId))
    return res.data?.data || []
  },

  createPackage: async (payload: Partial<FnbFoodPackage>): Promise<FnbFoodPackage> => {
    const res = await api.post(API_ENDPOINTS.fnb.packages.create, payload)
    return res.data?.data
  },

  updatePackage: async (id: string, payload: Partial<FnbFoodPackage>): Promise<FnbFoodPackage> => {
    const res = await api.patch(API_ENDPOINTS.fnb.packages.update(id), payload)
    return res.data?.data
  },

  deletePackage: async (id: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.fnb.packages.delete(id))
  },

  // ==================== Meal Slots ====================
  getMealSlots: async (locId: string): Promise<FnbPropertyMealSlot[]> => {
    const res = await api.get(API_ENDPOINTS.fnb.mealSlots.list(locId))
    return res.data?.data || []
  },

  getGlobalMealSlots: async (): Promise<FnbGlobalMealSlot[]> => {
    const res = await api.get(API_ENDPOINTS.fnb.mealSlots.global)
    return res.data?.data || []
  },

  createMealSlot: async (payload: Partial<FnbPropertyMealSlot>): Promise<FnbPropertyMealSlot> => {
    const res = await api.post(API_ENDPOINTS.fnb.mealSlots.create, payload)
    return res.data?.data
  },

  updateMealSlot: async (id: string, payload: Partial<FnbPropertyMealSlot>): Promise<FnbPropertyMealSlot> => {
    const res = await api.patch(API_ENDPOINTS.fnb.mealSlots.update(id), payload)
    return res.data?.data
  },

  deleteMealSlot: async (id: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.fnb.mealSlots.delete(id))
  },

  // ==================== Special Slots ====================
  getSpecialSlots: async (locId: string): Promise<FnbPropertySpecialSlot[]> => {
    const res = await api.get(API_ENDPOINTS.fnb.specialSlots.list(locId))
    return res.data?.data || []
  },

  createSpecialSlot: async (payload: Record<string, unknown>): Promise<FnbPropertySpecialSlot> => {
    const res = await api.post(API_ENDPOINTS.fnb.specialSlots.create, payload)
    return res.data?.data
  },

  updateSpecialSlot: async (id: string, payload: Record<string, unknown>): Promise<FnbPropertySpecialSlot> => {
    const res = await api.patch(API_ENDPOINTS.fnb.specialSlots.update(id), payload)
    return res.data?.data
  },

  deleteSpecialSlot: async (id: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.fnb.specialSlots.delete(id))
  },

  // ==================== Dishes ====================
  getDishes: async (locId: string): Promise<FnbDish[]> => {
    const res = await api.get(API_ENDPOINTS.fnb.dishes.list(locId))
    return res.data?.data || []
  },

  getMasterDishes: async (): Promise<FnbDish[]> => {
    const res = await api.get(API_ENDPOINTS.fnb.dishes.master)
    return res.data?.data || []
  },

  createDish: async (payload: Partial<FnbDish>): Promise<FnbDish> => {
    const res = await api.post(API_ENDPOINTS.fnb.dishes.create, payload)
    return res.data?.data
  },

  updateDish: async (id: string, payload: Partial<FnbDish>): Promise<FnbDish> => {
    const res = await api.patch(API_ENDPOINTS.fnb.dishes.update(id), payload)
    return res.data?.data
  },

  deleteDish: async (id: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.fnb.dishes.delete(id))
  },

  // ==================== Daily Menu ====================
  getDailyMenu: async (locId: string, date: string): Promise<FnbDailyMenu | null> => {
    const res = await api.get(API_ENDPOINTS.fnb.dailyMenu.get(locId, date))
    return res.data?.data || null
  },

  publishDailyMenu: async (payload: Record<string, unknown>): Promise<FnbDailyMenu> => {
    const res = await api.post(API_ENDPOINTS.fnb.dailyMenu.publish, payload)
    return res.data?.data
  },

  updateMenuItem: async (id: string, payload: Record<string, unknown>): Promise<unknown> => {
    const res = await api.patch(API_ENDPOINTS.fnb.dailyMenu.updateItem(id), payload)
    return res.data?.data
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    await api.delete(API_ENDPOINTS.fnb.dailyMenu.deleteItem(id))
  },

  // ==================== Resident Orders ====================
  getResidentOrders: async (locId: string, filters?: Record<string, string>): Promise<FnbResidentOrder[]> => {
    const params = new URLSearchParams()
    params.append('locId', locId)
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.append(key, val)
      })
    }
    const res = await api.get(API_ENDPOINTS.fnb.residentOrders.list(params.toString()))
    return res.data?.data || []
  },

  updateOrderStatus: async (id: string, orderStatus: string): Promise<FnbResidentOrder> => {
    const res = await api.patch(API_ENDPOINTS.fnb.residentOrders.updateStatus(id), { orderStatus })
    return res.data?.data
  },

  assignDeliveryEmployee: async (
    id: string,
    payload: { employeeId: string; deliveryCharge?: number },
  ): Promise<{ order: FnbResidentOrder; delivery: FnbFoodDelivery }> => {
    const res = await api.post(API_ENDPOINTS.fnb.residentOrders.assignDelivery(id), payload)
    return res.data?.data
  },

  completeDelivery: async (
    id: string,
    payload: { photoUrl?: string },
  ): Promise<{ order: FnbResidentOrder; delivery: FnbFoodDelivery }> => {
    const res = await api.post(API_ENDPOINTS.fnb.residentOrders.completeDelivery(id), payload)
    return res.data?.data
  },

  getStaffEmployees: async (locId: string): Promise<Record<string, unknown>[]> => {
    const res = await api.get(API_ENDPOINTS.fnb.staffEmployees(locId))
    return res.data?.data || []
  },

  // ==================== Subscriptions ====================
  assignResidentSubscription: async (payload: {
    locId: string
    residentId: string
    packageId: string
    startDate?: string
  }): Promise<FnbResidentSubscription> => {
    const res = await api.post(API_ENDPOINTS.fnb.residentSubscriptions.assign, payload)
    return res.data?.data
  },

  getResidentSubscription: async (residentId: string): Promise<FnbResidentSubscription | null> => {
    const res = await api.get(API_ENDPOINTS.fnb.residentSubscriptions.get(residentId))
    return res.data?.data || null
  },
}
