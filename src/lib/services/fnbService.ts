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
  FnbFoodAttendanceMember,
  FnbFoodAttendanceFlat,
  FnbAttendanceSummary,
} from '@/lib/types/fnb'

export interface GetAttendanceMembersResponse {
  date: string
  locId: string
  mealSlotKey: string
  members: FnbFoodAttendanceMember[]
  flats: FnbFoodAttendanceFlat[]
  summary: FnbAttendanceSummary
}

export interface MarkAttendancePayload {
  locId: string
  date: string
  mealSlotKey: string
  memberId: string
  memberType: 'resident' | 'family'
  attended: boolean
}

export interface MarkGuestAttendancePayload {
  locId: string
  date: string
  mealSlotKey: string
  flatId: string
  residentId: string
  guestCount: number
  guestName?: string
  guestPhone?: string
}

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
    const res = await api.get(API_ENDPOINTS.fnb.globalMealSlots)
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

  // ==================== Menus & Planner ====================
  getMenus: async (locId: string) => {
    return api.get(API_ENDPOINTS.fnb.menus.list(locId))
  },

  getPropertyDishes: async (locId: string) => {
    return api.get(API_ENDPOINTS.fnb.dishes.propertyDishes(locId))
  },

  getPropertyMealSlots: async (locId: string) => {
    return api.get(API_ENDPOINTS.fnb.mealSlots.propertyMealSlots(locId))
  },

  getPropertySpecialSlots: async (locId: string) => {
    return api.get(API_ENDPOINTS.fnb.specialSlots.propertySpecialSlots(locId))
  },

  createMenu: async (payload: Record<string, unknown>) => {
    return api.post(API_ENDPOINTS.fnb.menus.create, payload)
  },

  syncSpecialSlotDishes: async (payload: {
    propertySpecialSlotId: string
    locId: string
    dishes: { dishId: string; price: number }[]
  }) => {
    return api.post(API_ENDPOINTS.fnb.specialSlots.syncDishes, payload)
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

  // ==================== Food Attendance ====================
  getAttendanceMembersAndFlats: async (
    locId: string,
    date: string,
    mealSlotKey?: string,
    search?: string,
  ): Promise<GetAttendanceMembersResponse> => {
    const params = new URLSearchParams()
    params.set('locId', locId)
    params.set('date', date)
    if (mealSlotKey) params.set('mealSlotKey', mealSlotKey)
    if (search) params.set('search', search)

    const res = await api.get(API_ENDPOINTS.fnb.attendance.getMembersAndFlats(params.toString()))
    return res.data?.data
  },

  getAttendanceSummary: async (locId: string, date: string, mealSlotKey?: string): Promise<FnbAttendanceSummary> => {
    const params = new URLSearchParams()
    params.set('locId', locId)
    params.set('date', date)
    if (mealSlotKey) params.set('mealSlotKey', mealSlotKey)

    const res = await api.get(API_ENDPOINTS.fnb.attendance.summary(params.toString()))
    return res.data?.data
  },

  // ==================== Resident Package Subscriptions ====================
  getResidentPackage: async (residentId: string): Promise<Record<string, unknown>[]> => {
    const res = await api.get(API_ENDPOINTS.fnb.residentPackage.get(residentId))
    return res.data?.data || []
  },
  assignResidentPackage: async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const res = await api.post(API_ENDPOINTS.fnb.residentPackage.assign, payload)
    return res.data?.data
  },
  changeResidentPackage: async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const res = await api.post(API_ENDPOINTS.fnb.residentPackage.change, payload)
    return res.data?.data
  },
  togglePauseResidentPackage: async (id: string): Promise<Record<string, unknown>> => {
    const res = await api.patch(API_ENDPOINTS.fnb.residentPackage.togglePause(id))
    return res.data?.data
  },
}

export const fnbAttendanceService = {
  getMembersAndFlats: fnbService.getAttendanceMembersAndFlats,
  getSummary: fnbService.getAttendanceSummary,
}
