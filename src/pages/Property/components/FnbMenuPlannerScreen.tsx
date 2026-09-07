import { useCallback, useEffect, useState, useRef } from 'react'
import {
  Calendar as CalendarIcon,
  Utensils,
  Trash2,
  Sparkles,
  Send,
  Eye,
  GripVertical,
  Search,
  ArrowRight,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Clock,
} from 'lucide-react'
import api from '@/lib/api/axios'
import { getFileUrl } from '@/lib/utils'
import { notifyError, notifySuccess } from '@/utils/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface Dish {
  id: string
  name: string
  category: string
  dietaryType: string
  basePrice: number
  imageUrl?: string
  image_url?: string
  photoUrl?: string
  photo_url?: string
}

const getDishImageUrl = (dishObj?: Dish | Record<string, unknown> | null): string | null => {
  if (!dishObj) return null
  const d = dishObj as Record<string, unknown>
  const url = d.imageUrl || d.image_url || d.photoUrl || d.photo_url
  if (typeof url === 'string' && url.trim()) {
    return getFileUrl(url.trim())
  }
  return null
}

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

interface PropertyMealSlot {
  id: string
  locId: string
  globalMealSlotId?: string
  name: string
  code?: string
  startTime: string
  endTime: string
  price: number
  isActive: boolean
}

interface PropertySpecialSlotDishInfo {
  id: string
  propertySpecialSlotId: string
  locId: string
  dishId: string
  price: number
  dish?: Dish
}

interface PropertySpecialSlotInfo {
  id: string
  globalSpecialSlotId: string
  locId: string
  name: string
  description?: string | null
  specialDishes?: PropertySpecialSlotDishInfo[]
}

interface MenuItem {
  id: string
  menuId?: string
  locId?: string
  dayOfWeek?: DayOfWeek | null
  date?: string | null
  isOverride?: boolean
  mealSlot?: string
  mealSlotId?: string | null
  dishId: string
  isOptional: boolean
  extraPrice: number
  notes?: string
  dish?: Dish
}

interface Menu {
  id: string
  locId: string
  title: string
  status: 'draft' | 'published' | 'archived'
  menuItems?: MenuItem[]
  items?: MenuItem[]
}

interface FnbMenuPlannerProps {
  locId: string
}

const DAYS_OF_WEEK: { label: string; value: DayOfWeek; short: string }[] = [
  { label: 'Monday', value: 'monday', short: 'MON' },
  { label: 'Tuesday', value: 'tuesday', short: 'TUE' },
  { label: 'Wednesday', value: 'wednesday', short: 'WED' },
  { label: 'Thursday', value: 'thursday', short: 'THU' },
  { label: 'Friday', value: 'friday', short: 'FRI' },
  { label: 'Saturday', value: 'saturday', short: 'SAT' },
  { label: 'Sunday', value: 'sunday', short: 'SUN' },
]

// Helper to format YYYY-MM-DD to DD-MM-YYYY
const formatDDMMYYYY = (dateStr: string): string => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
}

const getTodayDateStr = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTodayDayOfWeek = (): DayOfWeek => {
  const dt = new Date()
  const dayIdx = dt.getDay() // 0 = Sunday, 1 = Monday, ...
  const map: Record<number, DayOfWeek> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }
  return map[dayIdx] || 'monday'
}

// Get day of week string from date string
const getDayOfWeekFromDate = (dateStr: string): DayOfWeek => {
  const parts = dateStr.split('-')
  let dt: Date
  if (parts.length === 3) {
    dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  } else {
    dt = new Date(dateStr)
  }
  const dayIdx = dt.getDay() // 0 = Sunday, 1 = Monday, ...
  const map: Record<number, DayOfWeek> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }
  return map[dayIdx] || 'monday'
}

// Helper to get array of 7 dates for a given week starting Monday
const getWeekDates = (referenceDateStr: string): { dateStr: string; dayOfWeek: DayOfWeek; label: string }[] => {
  const parts = referenceDateStr.split('-')
  let dt: Date
  if (parts.length === 3) {
    dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  } else {
    dt = new Date(referenceDateStr)
  }
  if (isNaN(dt.getTime())) return []

  const day = dt.getDay()
  const diffToMonday = dt.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(dt.getFullYear(), dt.getMonth(), diffToMonday)

  const week: { dateStr: string; dayOfWeek: DayOfWeek; label: string }[] = []
  const mapDays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dateNum = String(d.getDate()).padStart(2, '0')
    const dStr = `${y}-${m}-${dateNum}`
    week.push({
      dateStr: dStr,
      dayOfWeek: mapDays[i],
      label: DAYS_OF_WEEK[i].label,
    })
  }

  return week
}

export function FnbMenuPlannerScreen({ locId }: FnbMenuPlannerProps) {
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  // Selected Reference Date for Calendar Week View (Defaults to Today)
  const [currentWeekRefDate, setCurrentWeekRefDate] = useState<string>(() => getTodayDateStr())

  // Selected Day for Recurring Base Weekly Builder (Defaults to Current Day of Week)
  const [activeBaseDay, setActiveBaseDay] = useState<DayOfWeek>(() => getTodayDayOfWeek())

  // Week Navigation Carousel Handlers
  const handlePrevWeek = () => {
    const parts = currentWeekRefDate.split('-')
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    d.setDate(d.getDate() - 7)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dateNum = String(d.getDate()).padStart(2, '0')
    setCurrentWeekRefDate(`${y}-${m}-${dateNum}`)
  }

  const handleNextWeek = () => {
    const parts = currentWeekRefDate.split('-')
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    d.setDate(d.getDate() + 7)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dateNum = String(d.getDate()).padStart(2, '0')
    setCurrentWeekRefDate(`${y}-${m}-${dateNum}`)
  }

  const handleResetToCurrentWeek = () => {
    const todayStr = getTodayDateStr()
    setCurrentWeekRefDate(todayStr)
    setActiveBaseDay(getTodayDayOfWeek())
  }

  // Calendar Popover State
  const [isCalendarPopoverOpen, setIsCalendarPopoverOpen] = useState(false)

  // Custom Menu Preview Mode State
  const [isPreviewingCustomOverride, setIsPreviewingCustomOverride] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPreviewingCustomOverride(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [activeBaseDay, currentWeekRefDate])

  // Helper to select any date from calendar picker and switch week view & open customizer
  const handleSelectDateFromCalendar = (dStr: string) => {
    if (!dStr) return
    setCurrentWeekRefDate(dStr)
    const dayOfWeek = getDayOfWeekFromDate(dStr)
    setActiveBaseDay(dayOfWeek)
    handleOpenDateCustomizer(dStr)
  }

  // Drag & Drop State for Base Menu Builder
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null)

  // Carousel refs & scroll handlers for Category Pills
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const modalCategoryScrollRef = useRef<HTMLDivElement>(null)

  const scrollCategoryLeft = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -150, behavior: 'smooth' })
    }
  }

  const scrollCategoryRight = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 150, behavior: 'smooth' })
    }
  }

  // Property Meal Slots State
  const [propertyMealSlots, setPropertyMealSlots] = useState<PropertyMealSlot[]>([])
  const [propertySpecialSlots, setPropertySpecialSlots] = useState<PropertySpecialSlotInfo[]>([])

  // Collapsible Meal Slots State
  const [collapsedSlots, setCollapsedSlots] = useState<Record<string, boolean>>({})
  const [modalCollapsedSlots, setModalCollapsedSlots] = useState<Record<string, boolean>>({})

  const toggleSlotCollapse = (slotId: string) => {
    setCollapsedSlots((prev) => ({
      ...prev,
      [slotId]: !prev[slotId],
    }))
  }

  const toggleModalSlotCollapse = (slotId: string) => {
    setModalCollapsedSlots((prev) => ({
      ...prev,
      [slotId]: !prev[slotId],
    }))
  }

  const handleCollapseAll = () => {
    const newMap: Record<string, boolean> = {}
    propertyMealSlots.forEach((slot) => {
      newMap[slot.id] = true
    })
    propertySpecialSlots.forEach((spSlot) => {
      newMap[`special-${spSlot.id}`] = true
    })
    setCollapsedSlots(newMap)
  }

  const handleExpandAll = () => {
    setCollapsedSlots({})
  }

  // Date Customizer Modal State
  const [isDateCustomizerOpen, setIsDateCustomizerOpen] = useState(false)
  const [selectedDateForModal, setSelectedDateForModal] = useState<string>('')
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [modalSelectedCategory, setModalSelectedCategory] = useState<string>('all')
  const [modalDragOverSlotId, setModalDragOverSlotId] = useState<string | null>(null)

  // Review & Publish Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false)

  // Fetch menu, dishes, and property meal slots
  const fetchMenuAndDishes = useCallback(async () => {
    try {
      setLoading(true)
      const [mRes, dRes, slotsRes, specialSlotsRes] = await Promise.all([
        api.get(`/fnb/menus?locId=${locId}`),
        api.get(`/fnb/properties/${locId}/dishes`),
        api.get(`/fnb/property-meal-slots?locId=${locId}`),
        api.get(`/fnb/property-special-slots?locId=${locId}`).catch(() => ({ data: { success: false } })),
      ])

      if (specialSlotsRes.data?.success) {
        setPropertySpecialSlots(specialSlotsRes.data.data || [])
      }

      if (slotsRes.data?.success) {
        const rawSlots = slotsRes.data.data || []
        const parseTimeToMinutes = (tStr: string): number => {
          if (!tStr) return 0
          const parts = tStr.split(':').map((p) => parseInt(p, 10) || 0)
          return (parts[0] || 0) * 60 + (parts[1] || 0)
        }
        const sortedSlots = [...rawSlots].sort(
          (a: { startTime?: string }, b: { startTime?: string }) =>
            parseTimeToMinutes(a.startTime || '00:00') - parseTimeToMinutes(b.startTime || '00:00'),
        )
        setPropertyMealSlots(sortedSlots)
      }

      if (dRes.data?.success) {
        const rawDishes = dRes.data.data
        const parsedDishes: Dish[] = Array.isArray(rawDishes)
          ? rawDishes
              .filter((item) => item.isAvailable !== false)
              .map((item) => {
                const baseDish = item.dish ? item.dish : item
                const locPrice =
                  item.price !== undefined && item.price !== null ? Number(item.price) : Number(baseDish.basePrice || 0)
                return {
                  ...baseDish,
                  basePrice: locPrice,
                }
              })
          : []
        setDishes(parsedDishes)
      }

      if (mRes.data?.success && mRes.data.data?.length > 0) {
        const currentMenu: Menu = mRes.data.data[0]
        setSelectedMenu(currentMenu)
        const items = currentMenu.menuItems || currentMenu.items || []
        setMenuItems(items)
        setHasUnpublishedChanges(currentMenu.status === 'draft')
      }
    } catch (err) {
      console.error('Failed to load food menu:', err)
    } finally {
      setLoading(false)
    }
  }, [locId])

  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      if (!ignore) {
        await fetchMenuAndDishes()
      }
    }
    void loadData()
    return () => {
      ignore = true
    }
  }, [fetchMenuAndDishes])

  // Categories list for filtering dishes
  const categories = [
    { label: 'All Dishes', value: 'all' },
    { label: 'Breakfast', value: 'breakfast' },
    { label: 'Starters', value: 'starters' },
    { label: 'Main Course', value: 'main_course' },
    { label: 'Breads', value: 'breads' },
    { label: 'Rice & Biryani', value: 'rice_biryani' },
    { label: 'Snacks & Desserts', value: 'snacks_desserts' },
    { label: 'Beverages', value: 'beverages' },
    { label: 'Other', value: 'other' },
  ]

  // Filtered dishes for sidebar palettes
  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = selectedCategory === 'all' || dish.category === selectedCategory
    const matchesSearch = !searchQuery.trim() || dish.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const modalFilteredDishes = dishes.filter((dish) => {
    const matchesCategory = modalSelectedCategory === 'all' || dish.category === modalSelectedCategory
    const matchesSearch = !modalSearchQuery.trim() || dish.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Check if a menuItem belongs to a given property meal slot
  const isItemInSlot = (item: MenuItem, slot: PropertyMealSlot) => {
    const slotNameLower = slot.name.toLowerCase()
    if (item.mealSlotId && (item.mealSlotId === slot.id || item.mealSlotId === slot.globalMealSlotId)) {
      return true
    }
    if (item.mealSlot && item.mealSlot.toLowerCase() === slotNameLower) {
      return true
    }
    return false
  }

  // Get items for active base day (Recurring template: dayOfWeek set, date IS NULL)
  const getBaseDayItems = (day: DayOfWeek, slot: PropertyMealSlot): MenuItem[] => {
    return menuItems.filter((item) => item.dayOfWeek === day && !item.date && isItemInSlot(item, slot))
  }

  // Add Dish to Recurring Weekly Template (Local state edit until published)
  const handleAddBaseWeeklyDish = (slot: PropertyMealSlot, dishId: string) => {
    const dishObj = dishes.find((d) => d.id === dishId)
    if (!dishObj) return

    const alreadyExists = menuItems.some(
      (item) => item.dayOfWeek === activeBaseDay && !item.date && isItemInSlot(item, slot) && item.dishId === dishId,
    )

    if (alreadyExists) {
      notifyError(`"${dishObj.name}" is already added to All ${activeBaseDay.toUpperCase()}s (${slot.name})!`)
      return
    }

    const newItem: MenuItem = {
      id: `temp-${crypto.randomUUID()}`,
      locId,
      dayOfWeek: activeBaseDay,
      date: null,
      isOverride: false,
      mealSlot: slot.name.toLowerCase(),
      mealSlotId: slot.id,
      dishId,
      isOptional: false,
      extraPrice: 0,
      dish: dishObj,
    }

    setMenuItems((prev) => [...prev, newItem])
    setHasUnpublishedChanges(true)
    notifySuccess(`Added "${dishObj.name}" to draft menu (All ${activeBaseDay.toUpperCase()}s - ${slot.name})!`)
  }

  // Special Slot Dish Handlers (Local Draft Edits until Published)
  const handleAddSpecialDish = (propertySpecialSlotId: string, dishId: string, customPrice?: number) => {
    const dishObj = dishes.find((d) => d.id === dishId)
    if (!dishObj) return

    const priceToSet = customPrice !== undefined ? customPrice : Number(dishObj.basePrice || 0)

    setPropertySpecialSlots((prev) =>
      prev.map((spSlot) => {
        if (spSlot.id !== propertySpecialSlotId) return spSlot
        const currentDishes = spSlot.specialDishes || []
        const alreadyExists = currentDishes.some((sd) => sd.dishId === dishId)
        if (alreadyExists) {
          notifyError(`"${dishObj.name}" is already added to ${spSlot.name}!`)
          return spSlot
        }

        const newDishItem: PropertySpecialSlotDishInfo = {
          id: `temp-${crypto.randomUUID()}`,
          propertySpecialSlotId,
          locId,
          dishId,
          price: priceToSet,
          dish: dishObj,
        }
        return {
          ...spSlot,
          specialDishes: [...currentDishes, newDishItem],
        }
      }),
    )

    setHasUnpublishedChanges(true)
    notifySuccess(`Added "${dishObj.name}" to special meal slot draft!`)
  }

  const handleRemoveSpecialDish = (specialDishId: string, dishName?: string) => {
    setPropertySpecialSlots((prev) =>
      prev.map((spSlot) => ({
        ...spSlot,
        specialDishes: (spSlot.specialDishes || []).filter((sd) => sd.id !== specialDishId),
      })),
    )

    setHasUnpublishedChanges(true)
    notifySuccess(`Removed ${dishName ? `"${dishName}"` : 'dish'} from special meal slot draft!`)
  }

  // Remove Dish item (Local state edit until published)
  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((i) => i.id !== itemId))
    setHasUnpublishedChanges(true)
    notifySuccess('Removed dish from draft menu!')
  }

  // Open Date Customizer Modal for a target date
  const handleOpenDateCustomizer = (dStr: string) => {
    setSelectedDateForModal(dStr)
    setModalSearchQuery('')
    setModalSelectedCategory('all')
    setIsDateCustomizerOpen(true)
  }

  // Add Item via Drag & Drop inside Date Customizer Modal (Local state edit until published)
  const handleModalAddDishViaDrag = (slot: PropertyMealSlot, dishId: string) => {
    if (!selectedDateForModal) return

    const dishObj = dishes.find((d) => d.id === dishId)
    if (!dishObj) return

    const targetDayOfWeek = getDayOfWeekFromDate(selectedDateForModal)

    const alreadyExists = menuItems.some(
      (item) => item.date === selectedDateForModal && isItemInSlot(item, slot) && item.dishId === dishId,
    )

    if (alreadyExists) {
      notifyError(`"${dishObj.name}" is already added to ${slot.name} for ${formatDDMMYYYY(selectedDateForModal)}!`)
      return
    }

    const newItem: MenuItem = {
      id: `temp-${crypto.randomUUID()}`,
      locId,
      dayOfWeek: targetDayOfWeek,
      date: selectedDateForModal,
      isOverride: true,
      mealSlot: slot.name.toLowerCase(),
      mealSlotId: slot.id,
      dishId,
      isOptional: false,
      extraPrice: 0,
      dish: dishObj,
    }

    setMenuItems((prev) => [...prev, newItem])
    setHasUnpublishedChanges(true)
    notifySuccess(`Added "${dishObj.name}" to draft menu for ${formatDDMMYYYY(selectedDateForModal)} (${slot.name})!`)
  }

  // Helper theme for slots
  const getSlotTheme = (name: string, index: number) => {
    const lower = name.toLowerCase()
    if (lower.includes('break') || lower.includes('morn')) {
      return { icon: '🌅', bg: 'bg-amber-50/40 border-amber-100', text: 'text-amber-900' }
    }
    if (lower.includes('lunch') || lower.includes('after')) {
      return { icon: '☀️', bg: 'bg-orange-50/40 border-orange-100', text: 'text-orange-900' }
    }
    if (lower.includes('snack') || lower.includes('even')) {
      return { icon: '🌇', bg: 'bg-rose-50/40 border-rose-100', text: 'text-rose-900' }
    }
    if (lower.includes('dinn') || lower.includes('night')) {
      return { icon: '🌙', bg: 'bg-indigo-50/40 border-indigo-100', text: 'text-indigo-900' }
    }
    const themes = [
      { icon: '🌅', bg: 'bg-amber-50/40 border-amber-100', text: 'text-amber-900' },
      { icon: '☀️', bg: 'bg-orange-50/40 border-orange-100', text: 'text-orange-900' },
      { icon: '🌇', bg: 'bg-rose-50/40 border-rose-100', text: 'text-rose-900' },
      { icon: '🌙', bg: 'bg-indigo-50/40 border-indigo-100', text: 'text-indigo-900' },
    ]
    return themes[index % themes.length]
  }

  // Publish Menu Action (Fires bulk publish API call with all items & special slot dishes)
  const handlePublishMenu = async () => {
    try {
      setPublishing(true)
      const res = await api.post('/fnb/menus', {
        locId,
        title: selectedMenu?.title || 'Location Food Menu',
        status: 'published',
        items: menuItems.map((item) => ({
          dayOfWeek: item.dayOfWeek || null,
          date: item.date || null,
          isOverride: item.isOverride || false,
          mealSlot: item.mealSlot || null,
          mealSlotId: item.mealSlotId || null,
          dishId: item.dishId,
          isOptional: item.isOptional || false,
          extraPrice: item.extraPrice || 0,
        })),
      })

      if (!res.data?.success) {
        notifyError(res.data?.message || 'Failed to publish regular menu')
        return
      }

      // Sync all special slot dishes to database upon publishing
      for (const spSlot of propertySpecialSlots) {
        const dishesToSync = (spSlot.specialDishes || []).map((d) => ({
          dishId: d.dishId,
          price: d.price || 0,
        }))
        await api.post('/fnb/property-special-slots/sync-dishes', {
          propertySpecialSlotId: spSlot.id,
          locId,
          dishes: dishesToSync,
        })
      }

      notifySuccess('Food Menu & Special Slot Dishes reviewed and published successfully!')
      setIsReviewModalOpen(false)
      setHasUnpublishedChanges(false)
      fetchMenuAndDishes()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      console.error('Failed to publish menu:', err)
      notifyError(msg || 'Failed to publish menu')
    } finally {
      setPublishing(false)
    }
  }

  // Active 7 dates for the selected week
  const weekDates = getWeekDates(currentWeekRefDate)
  const todayStr = new Date().toISOString().split('T')[0]
  const activeSelectedDate = weekDates.find((w) => w.dayOfWeek === activeBaseDay)?.dateStr || todayStr

  return (
    <div className="space-y-6">
      {/* Top Overview Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#005390]" /> Food & Beverage Weekly Menu Planner
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Configure default dishes for <strong>All Mondays–Sundays</strong>, or customize dishes for{' '}
          <strong>specific dates</strong>.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading food menu...</div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: RECURRING WEEKLY BASE TEMPLATE (ALL MONDAYS - SUNDAYS) */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-6">
            <div className="space-y-5 border-b border-gray-100 pb-5">
              {/* Header Title + Action Controls inside Card */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#005390]" />
                    Recurring Weekly Menu (Applies to ALL {activeBaseDay.toUpperCase()}s)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a day of the week below to configure standard recurring dishes served every week on that day.
                  </p>
                </div>

                {/* Action Buttons & Status Badge grouped inside card */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={`capitalize px-3 py-1.5 text-xs font-bold rounded-xl ${
                      hasUnpublishedChanges || selectedMenu?.status === 'draft'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}
                  >
                    {hasUnpublishedChanges || selectedMenu?.status === 'draft' ? 'Draft / Unpublished' : 'Published'}
                  </Badge>

                  {/* Popover Calendar Date Picker */}
                  <Popover open={isCalendarPopoverOpen} onOpenChange={setIsCalendarPopoverOpen}>
                    <PopoverTrigger>
                      <Button
                        type="button"
                        variant="outline"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border-blue-200 bg-blue-50/80 text-[#005390] hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                      >
                        <CalendarIcon className="w-4 h-4 text-[#005390]" /> Select Date from Calendar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-3 bg-white rounded-2xl shadow-xl border border-gray-200"
                      align="end"
                    >
                      <Calendar
                        mode="single"
                        selected={currentWeekRefDate ? new Date(currentWeekRefDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const dStr = date.toISOString().split('T')[0]
                            handleSelectDateFromCalendar(dStr)
                            setIsCalendarPopoverOpen(false)
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Customize / Edit Custom Menu Button */}
                  {(() => {
                    const hasCustomOverride = menuItems.some((i) => i.date === activeSelectedDate)
                    let btnLabel = ''
                    if (hasCustomOverride) {
                      btnLabel = 'Edit Custom Menu'
                    } else if (activeSelectedDate === todayStr) {
                      btnLabel = "Customize Today's Menu"
                    } else {
                      btnLabel = `Customize ${formatDDMMYYYY(activeSelectedDate)} Menu`
                    }

                    return (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenDateCustomizer(activeSelectedDate)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-4 h-4 text-[#005390]" />
                        {btnLabel}
                      </Button>
                    )
                  })()}

                  {(() => {
                    const isAlreadyPublished = selectedMenu?.status === 'published' && !hasUnpublishedChanges
                    const isMenuEmpty = menuItems.length === 0
                    const isDisabled = isMenuEmpty || isAlreadyPublished

                    let tooltipTitle = ''
                    if (isAlreadyPublished) {
                      tooltipTitle = 'Menu is already published.'
                    } else if (isMenuEmpty) {
                      tooltipTitle = 'Add at least 1 dish to menu before reviewing or publishing'
                    }

                    return (
                      <Button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setIsReviewModalOpen(true)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                          isAlreadyPublished
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-70 shadow-none'
                            : isMenuEmpty
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                              : hasUnpublishedChanges || selectedMenu?.status === 'draft'
                                ? 'bg-amber-600 text-white hover:bg-amber-700 animate-pulse cursor-pointer'
                                : 'bg-[#005390] text-white hover:bg-[#004070] cursor-pointer'
                        }`}
                        title={tooltipTitle}
                      >
                        <Eye className="w-4 h-4" /> Review & Publish Menu
                      </Button>
                    )
                  })()}
                </div>
              </div>

              {/* WEEK CAROUSEL NAVIGATOR WITH CALENDAR DATE CARDS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 bg-gray-100/80 p-2 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevWeek}
                      className="h-8 px-3 bg-white hover:bg-gray-100 text-gray-700 font-extrabold border border-gray-200 rounded-xl cursor-pointer shrink-0"
                      title="Previous Week"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Prev Week
                    </Button>

                    <span className="text-xs font-extrabold text-gray-700 hidden sm:inline-block">
                      Week: {weekDates[0] ? formatDDMMYYYY(weekDates[0].dateStr) : ''} –{' '}
                      {weekDates[6] ? formatDDMMYYYY(weekDates[6].dateStr) : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetToCurrentWeek}
                      className="h-8 px-2.5 text-xs font-bold text-[#005390] hover:bg-blue-50 rounded-xl cursor-pointer shrink-0"
                      title="Reset to Current Week"
                    >
                      Today
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextWeek}
                      className="h-8 px-3 bg-white hover:bg-gray-100 text-gray-700 font-extrabold border border-gray-200 rounded-xl cursor-pointer shrink-0"
                      title="Next Week"
                    >
                      Next Week <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Calendar Date Cards Grid (Mon - Sun) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 w-full">
                  {weekDates.map((wItem) => {
                    const isSelected = activeBaseDay === wItem.dayOfWeek
                    const isToday = wItem.dateStr === getTodayDateStr()
                    const parts = wItem.dateStr.split('-')
                    const dayNum = Number(parts[2])
                    const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, dayNum)
                    const monthShort = dObj.toLocaleDateString('en-US', { month: 'short' })

                    return (
                      <button
                        type="button"
                        key={wItem.dayOfWeek}
                        onClick={() => setActiveBaseDay(wItem.dayOfWeek)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between text-center select-none shadow-2xs relative group py-3.5 ${
                          isSelected
                            ? 'bg-[#005390] text-white border-[#005390] shadow-md ring-2 ring-blue-200 scale-[1.02]'
                            : isToday
                              ? 'bg-blue-50/70 text-gray-900 border-blue-300 ring-2 ring-blue-100'
                              : 'bg-white text-gray-700 hover:bg-blue-50/50 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {/* Day Label (e.g. MON) */}
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}
                          >
                            {wItem.label.slice(0, 3)}
                          </span>
                          {isToday && (
                            <span
                              className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                isSelected ? 'bg-amber-400 text-gray-900' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              Today
                            </span>
                          )}
                        </div>

                        {/* Big Calendar Date Number (e.g. 31) */}
                        <span className={`text-2xl font-black my-1.5 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {dayNum < 10 ? `0${dayNum}` : dayNum}
                        </span>

                        {/* Month Subtext (e.g. Aug) */}
                        <span className={`text-xs font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                          {monthShort}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Custom Menu Override Preview Toggle Banner (if custom override exists for active selected date) */}
            {(() => {
              const activeDateStr = weekDates.find((w) => w.dayOfWeek === activeBaseDay)?.dateStr || ''
              const dateOverridesCount = menuItems.filter((i) => i.date === activeDateStr).length

              if (dateOverridesCount === 0) return null

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/90 border border-amber-200 p-3.5 rounded-2xl shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-xs font-bold text-amber-900">
                      Custom Menu on {formatDDMMYYYY(activeDateStr)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant={isPreviewingCustomOverride ? 'default' : 'outline'}
                      onClick={() => setIsPreviewingCustomOverride(!isPreviewingCustomOverride)}
                      className={`h-8 px-3.5 text-xs font-extrabold rounded-xl cursor-pointer transition-all ${
                        isPreviewingCustomOverride
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                          : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {isPreviewingCustomOverride ? 'View Weekly Menu' : 'Preview Custom Menu'}
                    </Button>
                  </div>
                </div>
              )
            })()}

            {/* 2-Column Drag & Drop Area for Recurring Base Day / Custom Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sidebar Palette */}
              <div className="lg:col-span-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80 space-y-4 flex flex-col max-h-[calc(100vh-120px)] sticky top-4 self-start shadow-2xs">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#005390]" /> Available Dishes
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-[#005390] rounded-full shrink-0">
                    {isPreviewingCustomOverride ? 'Preview Mode' : `Drag to ${activeBaseDay.toUpperCase()} Slot`}
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search dishes by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#005390]"
                  />
                </div>

                {/* Category Filter Pills Carousel with Nav Buttons */}
                <div className="relative border-b border-gray-200/60 pb-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollCategoryLeft(categoryScrollRef)}
                    className="w-6 h-6 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 cursor-pointer shadow-2xs transition-colors"
                    title="Scroll Left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div
                    ref={categoryScrollRef}
                    className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none scroll-smooth flex-1"
                  >
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                          selectedCategory === cat.value
                            ? 'bg-[#005390] text-white shadow-2xs'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollCategoryRight(categoryScrollRef)}
                    className="w-6 h-6 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 cursor-pointer shadow-2xs transition-colors"
                    title="Scroll Right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {filteredDishes.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 italic">No dishes found.</div>
                  ) : (
                    filteredDishes.map((dish) => (
                      <div
                        key={dish.id}
                        draggable={!isPreviewingCustomOverride}
                        onDragStart={(e) => {
                          if (isPreviewingCustomOverride) return
                          e.dataTransfer.setData('text/plain', dish.id)
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        className={`p-3 bg-white rounded-xl border border-gray-200 transition-all flex items-center justify-between group shadow-2xs ${
                          isPreviewingCustomOverride
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:bg-blue-50/60 hover:border-blue-300 cursor-grab active:cursor-grabbing'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-[#005390] shrink-0" />
                          {(() => {
                            const imgUrl = getDishImageUrl(dish)
                            return imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={dish.name}
                                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/50">
                                <Utensils className="w-3.5 h-3.5" />
                              </div>
                            )
                          })()}
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-gray-900 truncate">{dish.name}</div>
                            <div className="text-[10px] text-gray-500 capitalize truncate mt-0.5">
                              <span className="font-semibold text-gray-700">{dish.category.replace('_', ' ')}</span> • ₹
                              {dish.basePrice}
                            </div>
                          </div>
                        </div>
                        {!isPreviewingCustomOverride &&
                          (propertyMealSlots.length > 0 || propertySpecialSlots.length > 0) && (
                            <Popover>
                              <PopoverTrigger
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#005390] text-[10px] font-extrabold rounded-lg border border-blue-200 shrink-0 flex items-center gap-0.5 transition-colors cursor-pointer"
                                title="1-Click Add to Meal Slot"
                              >
                                <Plus className="w-3 h-3" /> Add
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-52 p-1.5 bg-white rounded-xl shadow-lg border border-gray-200 text-xs"
                                align="end"
                              >
                                {propertyMealSlots.length > 0 && (
                                  <>
                                    <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
                                      Regular Slots:
                                    </div>
                                    {propertyMealSlots.map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleAddBaseWeeklyDish(s, dish.id)}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-gray-800 font-bold hover:text-[#005390] transition-colors flex items-center justify-between text-xs cursor-pointer"
                                      >
                                        <span>{s.name}</span>
                                        <span className="text-[10px] text-gray-400 font-normal">{s.startTime}</span>
                                      </button>
                                    ))}
                                  </>
                                )}

                                {propertySpecialSlots.length > 0 && (
                                  <>
                                    <div className="text-[10px] font-bold text-amber-600 px-2 py-1 mt-1 border-t border-gray-100 uppercase tracking-wider flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" /> Special Slots (Every Day):
                                    </div>
                                    {propertySpecialSlots.map((sp) => (
                                      <button
                                        key={sp.id}
                                        type="button"
                                        onClick={() => handleAddSpecialDish(sp.id, dish.id)}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-gray-800 font-bold hover:text-amber-800 transition-colors flex items-center justify-between text-xs cursor-pointer"
                                      >
                                        <span>{sp.name}</span>
                                        <span className="text-[10px] text-amber-600 font-semibold">Special</span>
                                      </button>
                                    ))}
                                  </>
                                )}
                              </PopoverContent>
                            </Popover>
                          )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Dynamic Property Meal Slots for Active Day of Week / Custom Preview */}
              <div className="lg:col-span-8">
                {propertyMealSlots.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-2xs space-y-3">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="text-base font-bold text-gray-800">No Meal Slots Assigned to This Property</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Go to the <strong>Meal Slots & Timings</strong> tab to assign meal slots to this property
                      location.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Meal Slots Toolbar with Collapse All / Expand All */}
                    <div className="flex items-center justify-between gap-3 mb-3.5 bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 shadow-2xs">
                      <span className="text-xs font-bold text-gray-700">
                        {propertyMealSlots.length} Meal Slot{propertyMealSlots.length !== 1 ? 's' : ''} Configured
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCollapseAll}
                          className="px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                        >
                          ↕️ Collapse All
                        </button>
                        <button
                          type="button"
                          onClick={handleExpandAll}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#005390] hover:bg-blue-50 bg-blue-50/50 border border-blue-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                        >
                          ↕️ Expand All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {propertyMealSlots.map((slot, index) => {
                        const theme = getSlotTheme(slot.name, index)
                        const activeDateStr = weekDates.find((w) => w.dayOfWeek === activeBaseDay)?.dateStr || ''
                        const slotItems = isPreviewingCustomOverride
                          ? menuItems.filter((i) => i.date === activeDateStr && isItemInSlot(i, slot))
                          : getBaseDayItems(activeBaseDay, slot)

                        const isHovering = !isPreviewingCustomOverride && dragOverSlotId === slot.id
                        const isCollapsed = Boolean(collapsedSlots[slot.id])

                        return (
                          <div
                            key={slot.id}
                            onDragOver={(e) => {
                              if (isPreviewingCustomOverride) return
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'copy'
                            }}
                            onDragEnter={(e) => {
                              if (isPreviewingCustomOverride) return
                              e.preventDefault()
                              setDragOverSlotId(slot.id)
                            }}
                            onDragLeave={() => {
                              setDragOverSlotId(null)
                            }}
                            onDrop={(e) => {
                              if (isPreviewingCustomOverride) return
                              e.preventDefault()
                              setDragOverSlotId(null)
                              const dishId = e.dataTransfer.getData('text/plain')
                              if (dishId) {
                                handleAddBaseWeeklyDish(slot, dishId)
                              }
                            }}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                              isCollapsed ? 'min-h-[70px]' : 'min-h-[220px]'
                            } ${
                              isHovering
                                ? 'bg-blue-50/90 border-2 border-dashed border-[#005390] ring-4 ring-blue-100 scale-[1.01] shadow-md'
                                : `${theme.bg}`
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{theme.icon}</span>
                                  <div>
                                    <span className="text-xs font-extrabold text-gray-800">{slot.name}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-semibold mt-0.5">
                                      <Clock className="w-3 h-3 text-[#005390]" />
                                      <span>
                                        {slot.startTime} - {slot.endTime}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-gray-500 shrink-0">
                                    {slotItems.length} Dish{slotItems.length !== 1 ? 'es' : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleSlotCollapse(slot.id)}
                                    className="p-1 rounded-lg hover:bg-white/80 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                                    title={isCollapsed ? 'Expand Meal Slot' : 'Collapse Meal Slot'}
                                  >
                                    {isCollapsed ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronUp className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {isHovering ? (
                                <div className="py-4 text-center font-extrabold text-xs text-[#005390] bg-white/90 rounded-xl border border-dashed border-[#005390] animate-pulse shadow-2xs">
                                  ⬇️ Drop Dish to add to {slot.name}
                                </div>
                              ) : isCollapsed ? (
                                <div className="text-[11px] text-gray-600 font-medium italic truncate flex items-center justify-between pt-0.5">
                                  <span className="truncate">
                                    {slotItems.length > 0
                                      ? slotItems
                                          .map((i) => (dishes.find((d) => d.id === i.dishId) || i.dish)?.name)
                                          .filter(Boolean)
                                          .join(', ')
                                      : 'No dishes added yet.'}
                                  </span>
                                </div>
                              ) : slotItems.length === 0 ? (
                                <div className="py-8 text-center text-xs text-gray-400 italic bg-white/50 rounded-xl border border-dashed border-gray-200">
                                  {isPreviewingCustomOverride
                                    ? `No custom dishes configured for ${slot.name}.`
                                    : `Drag & drop dish here to serve on All ${activeBaseDay.toUpperCase()}s.`}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {slotItems.map((item) => {
                                    const fullDish = dishes.find((d) => d.id === item.dishId) || item.dish
                                    const imgUrl = getDishImageUrl(fullDish)

                                    return (
                                      <div
                                        key={item.id}
                                        className="bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-2.5"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                          {imgUrl ? (
                                            <img
                                              src={imgUrl}
                                              alt={fullDish?.name || 'Dish'}
                                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-200"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/50">
                                              <Utensils className="w-3.5 h-3.5" />
                                            </div>
                                          )}
                                          <div className="space-y-0.5 flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 text-xs truncate">
                                              {fullDish?.name || 'Dish'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 capitalize truncate">
                                              {fullDish?.category ? fullDish.category.replace('_', ' ') : ''} • ₹
                                              {dishes.find((d) => d.id === item.dishId)?.basePrice ??
                                                fullDish?.basePrice ??
                                                0}
                                            </div>
                                          </div>
                                        </div>
                                        {!isPreviewingCustomOverride && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMenuItem(item.id)}
                                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Special Meal Slots Section (Continuous / Available Every Day) */}
                {propertySpecialSlots.length > 0 && (
                  <div className="mt-6 space-y-3 pt-6 border-t border-gray-200/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                            Special Meal Slot
                          </h4>
                          <p className="text-[11px] text-amber-800/80 font-medium">
                            Dishes added to special meal slots remain active continuously on every day without date
                            restrictions.
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-extrabold uppercase shrink-0">
                        {propertySpecialSlots.length} Special Slot{propertySpecialSlots.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {propertySpecialSlots.map((spSlot) => {
                        const specDishes = spSlot.specialDishes || []
                        const isHovering = dragOverSlotId === `special-${spSlot.id}`
                        const isCollapsed = Boolean(collapsedSlots[`special-${spSlot.id}`])

                        return (
                          <div
                            key={spSlot.id}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'copy'
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault()
                              setDragOverSlotId(`special-${spSlot.id}`)
                            }}
                            onDragLeave={() => {
                              setDragOverSlotId(null)
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              setDragOverSlotId(null)
                              const dishId = e.dataTransfer.getData('text/plain')
                              if (dishId) {
                                handleAddSpecialDish(spSlot.id, dishId)
                              }
                            }}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-amber-50/30 border-amber-200/70 ${
                              isCollapsed ? 'min-h-[70px]' : 'min-h-[220px]'
                            } ${
                              isHovering
                                ? 'bg-amber-100/90 border-2 border-dashed border-amber-500 ring-4 ring-amber-100 scale-[1.01] shadow-md'
                                : ''
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">⭐</span>
                                  <div>
                                    <span className="text-xs font-black text-amber-950">{spSlot.name}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold mt-0.5">
                                      <Sparkles className="w-3 h-3 text-amber-500" />
                                      <span>Available Every Day</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-amber-800 shrink-0">
                                    {specDishes.length} Dish{specDishes.length !== 1 ? 'es' : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleSlotCollapse(`special-${spSlot.id}`)}
                                    className="p-1 rounded-lg hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer"
                                    title={isCollapsed ? 'Expand Special Slot' : 'Collapse Special Slot'}
                                  >
                                    {isCollapsed ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronUp className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {isHovering ? (
                                <div className="py-4 text-center font-extrabold text-xs text-amber-800 bg-white/90 rounded-xl border border-dashed border-amber-500 animate-pulse shadow-2xs">
                                  ⬇️ Drop Dish to add to {spSlot.name} (Special)
                                </div>
                              ) : isCollapsed ? (
                                <div className="text-[11px] text-amber-900 font-medium italic truncate flex items-center justify-between pt-0.5">
                                  <span className="truncate">
                                    {specDishes.length > 0
                                      ? specDishes.map((sd) => sd.dish?.name || 'Dish').join(', ')
                                      : 'No special dishes added yet.'}
                                  </span>
                                </div>
                              ) : specDishes.length === 0 ? (
                                <div className="py-8 text-center text-xs text-amber-800/60 italic bg-white/60 rounded-xl border border-dashed border-amber-200">
                                  Drag & drop dish here to serve on Every Day for {spSlot.name}.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {specDishes.map((sdItem) => {
                                    const fullDish = sdItem.dish
                                    const imgUrl = getDishImageUrl(fullDish)

                                    return (
                                      <div
                                        key={sdItem.id}
                                        className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between gap-2.5"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                          {imgUrl ? (
                                            <img
                                              src={imgUrl}
                                              alt={fullDish?.name || 'Dish'}
                                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-200"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/50">
                                              <Utensils className="w-3.5 h-3.5" />
                                            </div>
                                          )}
                                          <div className="space-y-0.5 flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 text-xs truncate">
                                              {fullDish?.name || 'Special Dish'}
                                            </div>
                                            <div className="text-[10px] text-amber-700 font-semibold capitalize truncate">
                                              Special Dish • ₹{sdItem.price}
                                            </div>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveSpecialDish(sdItem.id, fullDish?.name)}
                                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                          title="Remove from Special Slot"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHADCN UI DIALOG: DATE CUSTOMIZER MODAL WITH SCOPE SWITCHER */}
      <Dialog open={isDateCustomizerOpen} onOpenChange={setIsDateCustomizerOpen}>
        <DialogContent className="sm:max-w-[92vw] lg:max-w-[1280px] w-full h-[88vh] max-h-[850px] p-6 sm:p-7 flex flex-col gap-4 overflow-hidden border-none bg-white rounded-3xl shadow-2xl">
          {/* Modal Header */}
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 shrink-0 pr-8">
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#005390]" />
                Customize Food Menu
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                Target Date:{' '}
                <span className="font-bold text-[#005390]">
                  {selectedDateForModal
                    ? `${new Date(selectedDateForModal).toLocaleDateString('en-US', { weekday: 'long' })}, ${formatDDMMYYYY(selectedDateForModal)}`
                    : ''}
                </span>
              </DialogDescription>
            </div>

            {/* Carousel Navigation inside Modal */}
            <div className="flex items-center gap-2 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(selectedDateForModal)
                  d.setDate(d.getDate() - 1)
                  setSelectedDateForModal(d.toISOString().split('T')[0])
                }}
                className="h-8 px-2.5 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Prev Day
              </Button>

              <Badge
                variant="outline"
                className="px-3.5 py-1.5 bg-blue-50 text-[#005390] border-blue-200 text-xs font-bold rounded-xl shrink-0"
              >
                📅{' '}
                {selectedDateForModal
                  ? `${new Date(selectedDateForModal).toLocaleDateString('en-US', { weekday: 'short' })} (${formatDDMMYYYY(selectedDateForModal)})`
                  : ''}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(selectedDateForModal)
                  d.setDate(d.getDate() + 1)
                  setSelectedDateForModal(d.toISOString().split('T')[0])
                }}
                className="h-8 px-2.5 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl cursor-pointer"
                title="Next Day"
              >
                Next Day <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Modal Drag & Drop Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 py-1 overflow-hidden">
            {/* Left Sidebar Palette */}
            <div className="lg:col-span-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80 space-y-4 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-[#005390]" /> Available Dishes
                </h4>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-[#005390] rounded-full shrink-0">
                  Drag to Slot
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search dishes by name..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#005390]"
                />
              </div>

              {/* Category Filter Pills Carousel with Nav Buttons inside Modal */}
              <div className="relative border-b border-gray-200/60 pb-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollCategoryLeft(modalCategoryScrollRef)}
                  className="w-6 h-6 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 cursor-pointer shadow-2xs transition-colors"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div
                  ref={modalCategoryScrollRef}
                  className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none scroll-smooth flex-1"
                >
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setModalSelectedCategory(cat.value)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        modalSelectedCategory === cat.value
                          ? 'bg-[#005390] text-white shadow-2xs'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => scrollCategoryRight(modalCategoryScrollRef)}
                  className="w-6 h-6 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 shrink-0 cursor-pointer shadow-2xs transition-colors"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {modalFilteredDishes.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 italic">No dishes found.</div>
                ) : (
                  modalFilteredDishes.map((dish) => (
                    <div
                      key={dish.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', dish.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      className="p-3 bg-white hover:bg-blue-50/60 rounded-xl border border-gray-200 hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing flex items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-[#005390] shrink-0" />
                        {(() => {
                          const imgUrl = getDishImageUrl(dish)
                          return imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={dish.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/50">
                              <Utensils className="w-3.5 h-3.5" />
                            </div>
                          )
                        })()}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-gray-900 truncate">{dish.name}</div>
                          <div className="text-[10px] text-gray-500 capitalize truncate mt-0.5">
                            <span className="font-semibold text-gray-700">{dish.category.replace('_', ' ')}</span> • ₹
                            {dish.basePrice}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#005390] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5">
                        Drag <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Main Area: Dynamic Property Meal Slots */}
            <div className="lg:col-span-8 h-full overflow-y-auto pr-1">
              {propertyMealSlots.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-2xs space-y-3">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto" />
                  <h3 className="text-base font-bold text-gray-800">No Meal Slots Assigned</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Please configure meal slots for this location first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {propertyMealSlots.map((slot, index) => {
                    const theme = getSlotTheme(slot.name, index)
                    const modalDateOverrideItems = menuItems.filter(
                      (i) => i.date === selectedDateForModal && isItemInSlot(i, slot),
                    )
                    const isHovering = modalDragOverSlotId === slot.id
                    const isCollapsed = Boolean(modalCollapsedSlots[slot.id])

                    return (
                      <div
                        key={slot.id}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'copy'
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault()
                          setModalDragOverSlotId(slot.id)
                        }}
                        onDragLeave={() => {
                          setModalDragOverSlotId(null)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          setModalDragOverSlotId(null)
                          const dishId = e.dataTransfer.getData('text/plain')
                          if (dishId) {
                            handleModalAddDishViaDrag(slot, dishId)
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                          isCollapsed ? 'min-h-[70px]' : 'min-h-[220px]'
                        } ${
                          isHovering
                            ? 'bg-blue-50/90 border-2 border-dashed border-[#005390] ring-4 ring-blue-100 scale-[1.01] shadow-md'
                            : `${theme.bg}`
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{theme.icon}</span>
                              <div>
                                <span className="text-xs font-extrabold text-gray-800">{slot.name}</span>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-semibold mt-0.5">
                                  <Clock className="w-3 h-3 text-[#005390]" />
                                  <span>
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 shrink-0">
                                {modalDateOverrideItems.length} Dish{modalDateOverrideItems.length !== 1 ? 'es' : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleModalSlotCollapse(slot.id)}
                                className="p-1 rounded-lg hover:bg-white/80 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                                title={isCollapsed ? 'Expand Meal Slot' : 'Collapse Meal Slot'}
                              >
                                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {isHovering ? (
                            <div className="py-4 text-center font-extrabold text-xs text-[#005390] bg-white/90 rounded-xl border border-dashed border-[#005390] animate-pulse shadow-2xs">
                              ⬇️ Drop Dish to add to {slot.name} ({formatDDMMYYYY(selectedDateForModal)} ONLY)
                            </div>
                          ) : isCollapsed ? (
                            <div className="text-[11px] text-gray-600 font-medium italic truncate flex items-center justify-between pt-0.5">
                              <span className="truncate">
                                {modalDateOverrideItems.length > 0
                                  ? modalDateOverrideItems
                                      .map((i) => (dishes.find((d) => d.id === i.dishId) || i.dish)?.name)
                                      .filter(Boolean)
                                      .join(', ')
                                  : 'No dishes added yet.'}
                              </span>
                            </div>
                          ) : modalDateOverrideItems.length === 0 ? (
                            <div className="py-8 text-center text-xs text-gray-400 italic bg-white/50 rounded-xl border border-dashed border-gray-200">
                              Drag & drop dish here to configure {slot.name}.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {modalDateOverrideItems.map((item) => {
                                const fullDish = dishes.find((d) => d.id === item.dishId) || item.dish
                                const imgUrl = getDishImageUrl(fullDish)

                                return (
                                  <div
                                    key={item.id}
                                    className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between gap-2.5"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      {imgUrl ? (
                                        <img
                                          src={imgUrl}
                                          alt={fullDish?.name || 'Dish'}
                                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-200"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/50">
                                          <Utensils className="w-3.5 h-3.5" />
                                        </div>
                                      )}
                                      <div className="space-y-0.5 flex-1 min-w-0">
                                        <div className="font-bold text-gray-900 text-xs truncate">
                                          {fullDish?.name || 'Dish'}
                                        </div>
                                        <div className="text-[10px] text-gray-400 capitalize truncate">
                                          {fullDish?.category ? fullDish.category.replace('_', ' ') : ''} • ₹
                                          {dishes.find((d) => d.id === item.dishId)?.basePrice ??
                                            fullDish?.basePrice ??
                                            0}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => item.id && handleDeleteMenuItem(item.id)}
                                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end pt-3 border-t border-gray-100 shrink-0">
            <Button
              type="button"
              onClick={() => setIsDateCustomizerOpen(false)}
              className="px-6 py-2 bg-[#005390] hover:bg-[#004070] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Save & Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHADCN UI DIALOG: REVIEW & PUBLISH MENU */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-lg w-full p-6 flex flex-col gap-4 overflow-hidden bg-white rounded-3xl shadow-2xl border-none">
          <DialogHeader className="border-b border-gray-100 pb-3 pr-8">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#005390]" /> Review & Publish Food Menu
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              Review your configured food items before publishing to residents.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const selectedDayRecurringItems = menuItems.filter((i) => i.dayOfWeek === activeBaseDay && !i.date)
            const selectedDateCustomItems = menuItems.filter((i) => i.date === activeSelectedDate)

            const selectedDayTotalItems =
              selectedDateCustomItems.length > 0 ? selectedDateCustomItems.length : selectedDayRecurringItems.length

            return (
              <div className="space-y-4 text-xs py-1">
                {/* Target Context Header */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                  <div className="font-bold text-[#005390] flex items-center justify-between">
                    <span>Target Publishing Date</span>
                    <span className="font-black px-2.5 py-1 bg-blue-100 text-[#005390] rounded-xl text-xs">
                      {formatDDMMYYYY(activeSelectedDate)} ({activeBaseDay.toUpperCase()})
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Reviewing menu configuration for{' '}
                    <strong className="text-gray-900">
                      {activeBaseDay.toUpperCase()} ({formatDDMMYYYY(activeSelectedDate)})
                    </strong>
                    .
                  </p>
                </div>

                {/* Primary Card: Selected Date Metrics */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
                  <div className="font-extrabold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <span className="text-xs">
                      Menu Items for {formatDDMMYYYY(activeSelectedDate)} ({activeBaseDay.toUpperCase()})
                    </span>
                    <Badge
                      variant="secondary"
                      className="px-2.5 py-0.5 bg-blue-100 text-[#005390] font-extrabold text-xs"
                    >
                      {selectedDayTotalItems} Total Items
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-gray-700 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-600">
                        Recurring Weekly Items (All {activeBaseDay.toUpperCase()}s):
                      </span>
                      <span className="font-bold text-gray-900">{selectedDayRecurringItems.length} Items</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-600">
                        Date-Specific Custom Items ({formatDDMMYYYY(activeSelectedDate)}):
                      </span>
                      <span className="font-bold text-gray-900">
                        {selectedDateCustomItems.length === 0
                          ? '0 Items (Using Weekly Recurring Menu)'
                          : `${selectedDateCustomItems.length} Items`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="font-semibold text-amber-800 flex items-center gap-1">
                        ⭐ Special Meal Slots Dishes:
                      </span>
                      <span className="font-extrabold text-amber-900">
                        {propertySpecialSlots.reduce((acc, s) => acc + (s.specialDishes?.length || 0), 0)} Configured
                        Dishes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          <DialogFooter className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsReviewModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Continue Editing
            </Button>
            <Button
              type="button"
              onClick={handlePublishMenu}
              disabled={publishing}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              {publishing ? 'Publishing...' : 'Publish Menu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
