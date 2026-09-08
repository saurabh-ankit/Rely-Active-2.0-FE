export type FnbDietaryType = 'veg' | 'non_veg' | 'egg' | 'jain' | 'mixed' | 'vegan'
export type FnbMealSlotType = 'breakfast' | 'lunch' | 'snacks' | 'dinner'
export type FnbOrderStatusType =
  'placed' | 'accepted' | 'preparing' | 'ready' | 'delivering_to_room' | 'completed' | 'delivered' | 'cancelled'

export type FnbOrderTypeEnum = 'personal' | 'guest' | 'special' | 'custom'
export type FnbServiceTypeEnum = 'dine_in' | 'room_service'

export interface FnbFoodPackage {
  id: string
  locId: string
  packageName: string
  packageType: string
  includedSlots: string[]
  priceMonthly: number
  description?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FnbGlobalMealSlot {
  id: string
  name: string
  slotKey: string
  defaultStartTime: string
  defaultEndTime: string
  order: number
}

export interface FnbPropertyMealSlot {
  id: string
  locId: string
  globalMealSlotId?: string
  name: string
  slotKey?: string
  startTime: string
  endTime: string
  price?: number
  isIncludedInPackage?: boolean
  isActive: boolean
  globalMealSlot?: FnbGlobalMealSlot
  createdAt?: string
  updatedAt?: string
}

export interface FnbPropertySpecialSlotDish {
  id: string
  propertySpecialSlotId: string
  dishId: string
  price: number
  dish?: FnbDish
}

export interface FnbPropertySpecialSlot {
  id: string
  locId: string
  globalSpecialSlotId?: string
  name: string
  description?: string
  price?: number
  specialDishes?: FnbPropertySpecialSlotDish[]
  createdAt?: string
  updatedAt?: string
}

export interface FnbDish {
  id: string
  locId?: string
  name: string
  category: string
  dietaryType: FnbDietaryType
  basePrice: number
  imageUrl?: string
  description?: string
  isMaster?: boolean
  isAvailable?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FnbMenuItem {
  id: string
  dailyMenuId: string
  dishId: string
  globalMealSlotId: string
  propertyMealSlotId?: string
  isOptional: boolean
  isPackageCovered: boolean
  standardPrice: number
  extraPrice: number
  effectivePrice: number
  dish?: FnbDish
  globalMealSlot?: FnbGlobalMealSlot
}

export interface FnbDailyMenu {
  id: string
  locId: string
  date: string
  dayOfWeek?: string
  status: 'draft' | 'published' | 'archived'
  items?: FnbMenuItem[]
  createdAt?: string
  updatedAt?: string
}

export interface FnbResidentOrderDetail {
  id: string
  orderId: string
  menuItemId?: string | null
  dishId: string
  mealSlotId?: string | null
  specialMealSlotId?: string | null
  specialMealSlotDishId?: string | null
  quantity: number
  unitPrice: number
  amount: number
  isPackageCovered: boolean
  notes?: string | null
  dish?: FnbDish
  globalMealSlot?: FnbGlobalMealSlot
  specialMealSlot?: FnbPropertySpecialSlot
}

export interface FnbFoodDelivery {
  id: string
  locId: string
  orderId: string
  employeeId?: string | null
  deliveryCharge: number
  deliveryStatus: 'assigned' | 'delivering' | 'delivered' | 'failed'
  photoUrl?: string | null
  deliveryDate?: string
  deliveredAt?: string | null
  employee?: {
    id: string
    firstName?: string
    lastName?: string
    name?: string
  }
}

export interface FnbResidentOrder {
  id: string
  locId: string
  residentId?: string | null
  familyMemberId?: string | null
  residentPackageId?: string | null
  date: string
  mealSlotId?: string | null
  specialMealSlotId?: string | null
  isDish: number
  orderType: FnbOrderTypeEnum
  selectionType: 'dish' | 'slot' | 'entire_slot'
  serviceType: FnbServiceTypeEnum
  quantity: number
  unitPrice: number
  totalAmount: number
  deliveryCharge?: number
  isPackageCovered: boolean
  orderStatus: FnbOrderStatusType
  acceptedAt?: string | null
  preparingStartedAt?: string | null
  readyAt?: string | null
  deliveredAt?: string | null
  assignedEmployeeId?: string | null
  guestName?: string
  guestCount?: number
  resident?: {
    id: string
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
    unit?: {
      id: string
      unit_number: string
      floor?: {
        id: string
        floor_number?: number
        floor_name?: string
        name?: string
        block?: {
          id: string
          block_name?: string
          name?: string
        }
      }
    }
  }
  familyMember?: {
    id: string
    name: string
    relation?: string
    resident?: unknown
  }
  details?: FnbResidentOrderDetail[]
  delivery?: FnbFoodDelivery
  createdAt: string
  updatedAt: string
}

export interface FnbResidentSubscription {
  id: string
  locId: string
  residentId: string
  packageId: string
  startDate: string
  endDate?: string
  subscriptionStatus: 'active' | 'paused' | 'cancelled' | 'completed'
  package?: FnbFoodPackage
}

export interface FnbFoodAttendanceMember {
  memberId: string
  memberType: 'resident' | 'family'
  fullName: string
  relation?: string | null
  phone?: string | null
  photoUrl?: string | null
  residentId: string
  flatId?: string | null
  flatNumber: string
  fullLocation: string
  dietaryPreference?: string
  packageName?: string | null
  allowedMealSlots?: string[]
  hasActivePackage?: boolean
  package?: {
    id: string
    packageName: string
    includedMealSlots: string[]
  } | null
  isSlotIncludedInPackage: boolean
  attendance?: {
    id: string
    status?: string
    attended: boolean
    attendedAt: string
    mealSlotKey?: string | null
    slotKey?: string | null
    meal_slot_key?: string | null
    mealSlotId?: string | null
    meal_slot_id?: string | null
    mealSlot?: { id?: string; name?: string; slotKey?: string } | null
    orderId?: string | null
    created_by?: string | null
    created_by_user?: {
      id: string
      firstName?: string
      lastName?: string
    } | null
  } | null
  attendances?: Array<{
    id?: string
    status?: string
    attended?: boolean
    attendedAt?: string
    createdAt?: string
    created_at?: string
    mealSlotKey?: string | null
    slotKey?: string | null
    meal_slot_key?: string | null
    mealSlotId?: string | null
    meal_slot_id?: string | null
    mealSlot?: { id?: string; name?: string; slotKey?: string } | null
    orderId?: string | null
    created_by?: string | null
    created_by_user?: {
      id: string
      firstName?: string
      lastName?: string
    } | null
  }> | null
}

export interface FnbGuestAttendance {
  id: string
  guestName?: string
  guestPhone?: string
  guestCount: number
  mealSlotKey?: string
  globalMealSlotId?: string
  globalMealSlot?: {
    id: string
    name: string
  }
  attendedAt?: string
  createdAt?: string
  orderId?: string | null
  created_by_user?: {
    id: string
    firstName?: string
    lastName?: string
  } | null
}

export interface FnbFoodAttendanceFlat {
  unitId: string
  unitNumber: string
  fullLocation: string
  primaryResident: {
    id: string
    fullName: string
    phone?: string | null
  } | null
  members: FnbFoodAttendanceMember[]
  guestCount: number
  guestAttendances: FnbGuestAttendance[]
}

export interface FnbAttendanceSummary {
  date: string
  locId?: string
  mealSlotKey?: string
  totalResidingMembers: number
  totalPackageHolders?: number
  attendedMembersCount?: number
  absentMembersCount?: number
  totalGuestCount?: number
  attendedCount?: number
  totalDinedInToday?: number
  totalGuestDinedInToday?: number
  absentCount?: number
  pendingCount?: number
  guestMealsCount?: number
}
