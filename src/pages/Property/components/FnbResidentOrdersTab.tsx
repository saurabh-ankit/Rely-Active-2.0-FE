import { useEffect, useState } from 'react'
import {
  Search,
  Filter,
  ShoppingBag,
  User,
  Building2,
  Eye,
  X,
  Utensils,
  Truck,
  Camera,
  Clock,
  HelpCircle,
} from 'lucide-react'
import { fnbService } from '@/lib/services/fnbService'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface OrderDetail {
  id: string
  quantity: number
  unitPrice: number
  amount: number
  isPackageCovered: boolean
  notes?: string
  dish?: {
    id: string
    name: string
    category: string
    basePrice: number
  }
  globalMealSlot?: {
    id: string
    name: string
    code?: string
  }
  specialMealSlot?: {
    id: string
    name: string
  }
}

interface PropertyUnitInfo {
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

interface ResidentOrder {
  id: string
  locId: string
  residentId?: string | null
  familyMemberId?: string | null
  date: string
  mealSlot?: string | null
  orderType?: string
  selectionType?: string
  serviceType?: string
  guestName?: string | null
  guestCount?: number | null
  cutoffTime?: string | null
  totalAmount: number
  isPackageCovered: boolean
  orderStatus: string
  createdAt: string
  acceptedAt?: string | null
  preparingStartedAt?: string | null
  readyAt?: string | null
  deliveredAt?: string | null
  deliveryCharge?: number
  assignedEmployeeId?: string | null
  resident?: {
    id: string
    firstName: string
    lastName?: string
    phone?: string
    email?: string
    unit?: PropertyUnitInfo
  }
  familyMember?: {
    id: string
    firstName: string
    lastName?: string
    relation?: string
    phone?: string
    resident?: {
      id: string
      firstName: string
      lastName?: string
      unit?: PropertyUnitInfo
    }
  }
  specialMealSlot?: {
    id: string
    name: string
    price?: number
  }
  details?: OrderDetail[]
  delivery?: {
    id: string
    deliveryCharge: number
    deliveryStatus: string
    photoUrl?: string | null
    deliveredAt?: string | null
    employee?: {
      id: string
      username?: string
      email?: string
      phone?: string
    }
    employeeDetail?: {
      id: string
      firstName: string
      lastName?: string
      phone?: string
      employeeCode?: string
      photoUrl?: string
    }
  }
}

interface FnbResidentOrdersTabProps {
  locId: string
}

export function FnbResidentOrdersTab({ locId }: FnbResidentOrdersTabProps) {
  const [orders, setOrders] = useState<ResidentOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<ResidentOrder | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  // Delivery Assignment Modal State
  const [staffList, setStaffList] = useState<unknown[]>([])
  const [assigningOrder, setAssigningOrder] = useState<ResidentOrder | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [deliveryChargeInput, setDeliveryChargeInput] = useState<number>(0)
  const [submittingAssign, setSubmittingAssign] = useState(false)

  // Complete Delivery Proof Photo Modal State
  const [completingDeliveryOrder, setCompletingDeliveryOrder] = useState<ResidentOrder | null>(null)
  const [proofPhotoInput, setProofPhotoInput] = useState<string>('')
  const [submittingComplete, setSubmittingComplete] = useState(false)

  // Confirmation Modal State
  const [confirmModalData, setConfirmModalData] = useState<{
    order: ResidentOrder
    nextStatus: string
    actionLabel: string
  } | null>(null)

  const getNextStatusTransition = (order: ResidentOrder) => {
    const s = (order.orderStatus || 'placed').toLowerCase()
    if (s === 'placed') return { nextStatus: 'accepted', label: 'Accept Order' }
    if (s === 'accepted') return { nextStatus: 'preparing', label: 'Start Preparing' }
    if (s === 'preparing') {
      if (order.serviceType === 'dine_in') {
        return { nextStatus: 'ready', label: 'Food is Ready' }
      }
      return { nextStatus: 'assign_delivery', label: 'Assign Delivery Employee' }
    }
    if (s === 'ready' || s === 'food_ready') return { nextStatus: 'completed', label: 'Complete Order' }
    if (s === 'delivering_to_room') return { nextStatus: 'complete_delivery', label: 'Complete Delivery' }
    return null
  }

  const fetchStaffList = async () => {
    try {
      const data = await fnbService.getStaffEmployees(locId)
      setStaffList(data || [])
    } catch (err) {
      console.error('Failed to fetch staff employees:', err)
    }
  }

  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      try {
        setLoading(true)
        const filters: Record<string, string> = {}
        if (searchQuery.trim()) filters.search = searchQuery.trim()
        if (selectedStatus !== 'all') filters.orderStatus = selectedStatus
        if (selectedType !== 'all') filters.orderType = selectedType
        if (selectedDate) filters.date = selectedDate

        const data = await fnbService.getResidentOrders(locId, filters)
        if (!ignore) {
          setOrders((data as unknown as ResidentOrder[]) || [])
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg =
            err && typeof err === 'object' && 'response' in err
              ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
              : undefined
          toast.error(msg || 'Failed to load resident orders')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void loadData()
    return () => {
      ignore = true
    }
  }, [locId, searchQuery, selectedStatus, selectedType, selectedDate])

  const getFullLocationString = (unitObj?: PropertyUnitInfo) => {
    if (!unitObj) return 'N/A'
    const parts: string[] = []

    const bName = unitObj.floor?.block?.block_name || unitObj.floor?.block?.name
    if (bName) {
      parts.push(
        bName.toLowerCase().startsWith('block') || bName.toLowerCase().startsWith('tower') ? bName : `Block ${bName}`,
      )
    }

    const fName =
      unitObj.floor?.floor_name ||
      unitObj.floor?.name ||
      (unitObj.floor?.floor_number !== undefined ? `Floor ${unitObj.floor.floor_number}` : '')
    if (fName) {
      parts.push(fName.toLowerCase().startsWith('floor') ? fName : `Floor ${fName}`)
    }

    if (unitObj.unit_number) {
      const uNum = unitObj.unit_number
      parts.push(uNum.toLowerCase().startsWith('flat') ? uNum : `Flat ${uNum}`)
    }

    return parts.length > 0 ? parts.join(' • ') : 'N/A'
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatusId(orderId)
      await fnbService.updateOrderStatus(orderId, newStatus)
      toast.success(`Order status updated to ${newStatus.toUpperCase()}`)
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: newStatus } : null))
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to update order status')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const handleAssignDelivery = async () => {
    if (!assigningOrder) return
    try {
      setSubmittingAssign(true)
      await fnbService.assignDeliveryEmployee(assigningOrder.id, {
        employeeId: selectedStaffId || undefined,
        deliveryCharge: deliveryChargeInput,
      })
      toast.success('Delivery employee assigned successfully! 🛵')
      setAssigningOrder(null)
      setSelectedStaffId('')
      setDeliveryChargeInput(0)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to assign delivery employee')
    } finally {
      setSubmittingAssign(false)
    }
  }

  const handleCompleteDelivery = async () => {
    if (!completingDeliveryOrder) return
    try {
      setSubmittingComplete(true)
      await fnbService.completeDelivery(completingDeliveryOrder.id, {
        photoUrl: proofPhotoInput.trim() || undefined,
      })
      toast.success('Room delivery marked as completed! 🎉')
      setCompletingDeliveryOrder(null)
      setProofPhotoInput('')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || 'Failed to complete delivery')
    } finally {
      setSubmittingComplete(false)
    }
  }

  const getStatusBadge = (order: ResidentOrder) => {
    const s = (order.orderStatus || 'placed').toLowerCase()
    const transition = getNextStatusTransition(order)

    const handleBadgeClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (transition) {
        setConfirmModalData({
          order,
          nextStatus: transition.nextStatus,
          actionLabel: transition.label,
        })
      } else {
        setSelectedOrder(order)
      }
    }

    let badgeElement = null

    if (s === 'accepted') {
      badgeElement = (
        <Badge className="bg-blue-100 text-[#005390] border-blue-300 font-extrabold uppercase text-xs px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-blue-200 transition-all cursor-pointer">
          Order Accepted
        </Badge>
      )
    } else if (s === 'preparing') {
      badgeElement = (
        <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-extrabold uppercase text-xs px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-purple-200 transition-all cursor-pointer">
          Preparing 🍳
        </Badge>
      )
    } else if (s === 'ready' || s === 'food_ready') {
      badgeElement = (
        <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 font-extrabold uppercase text-xs px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-indigo-200 transition-all cursor-pointer">
          Food is Ready 🍽️
        </Badge>
      )
    } else if (s === 'delivering_to_room') {
      badgeElement = (
        <Badge className="bg-amber-100 text-amber-950 border-amber-300 font-extrabold uppercase text-xs px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-amber-200 transition-all cursor-pointer">
          Delivering to Room 🛵
        </Badge>
      )
    } else if (s === 'completed' || s === 'delivered') {
      badgeElement = (
        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold uppercase text-xs px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-emerald-200 transition-all cursor-pointer">
          Completed 🎉
        </Badge>
      )
    } else if (s === 'cancelled') {
      badgeElement = (
        <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-extrabold uppercase text-xs px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-rose-200 transition-all cursor-pointer">
          Cancelled
        </Badge>
      )
    } else {
      badgeElement = (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold uppercase text-xs px-3.5 py-1.5 rounded-xl shadow-2xs hover:bg-amber-200 transition-all cursor-pointer">
          Placed
        </Badge>
      )
    }

    return (
      <button
        type="button"
        onClick={handleBadgeClick}
        className="inline-block cursor-pointer hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent p-0"
        title={transition ? `Click to ${transition.label}` : 'View Details'}
      >
        {badgeElement}
      </button>
    )
  }

  const getTypeBadge = (order: ResidentOrder) => {
    const t = (order.orderType || 'personal').toLowerCase()
    if (t === 'guest') {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-900 border-purple-200 text-[10px] font-bold">
          👥 Guest ({order.guestName || 'Guest'} x{order.guestCount || 1})
        </Badge>
      )
    }
    if (t === 'special') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 text-[10px] font-bold">
          ⭐ Special ({order.specialMealSlot?.name || 'Special Slot'})
        </Badge>
      )
    }
    if (t === 'custom') {
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-900 border-indigo-200 text-[10px] font-bold">
          🛠️ Custom
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-[#005390] border-blue-200 text-[10px] font-bold">
        👤 Personal
      </Badge>
    )
  }

  const getServiceTypeBadge = (serviceType?: string) => {
    if (serviceType === 'room_service') {
      return (
        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          🚪 Room Service
        </span>
      )
    }
    return (
      <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
        🍽️ Dine In
      </span>
    )
  }

  return (
    <div className="space-y-5 select-none font-sans">
      {/* Top Filter Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#005390]" />
              Resident Meal Orders
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              View and manage all real-time meal orders placed by residents and guests for this location.
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search resident, unit, order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005390]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005390]"
            >
              <option value="all">All Order Statuses</option>
              <option value="placed">Placed</option>
              <option value="accepted">Accepted</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Food is Ready</option>
              <option value="delivering_to_room">Delivering to Room</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005390]"
            >
              <option value="all">All Order Types</option>
              <option value="personal">Personal Meal</option>
              <option value="guest">Guest Meal</option>
              <option value="special">Special Meal</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005390]"
            />
          </div>
        </div>
      </div>

      {/* Orders Table & DataTable Pagination Container */}
      {(() => {
        const totalItems = orders.length
        const totalPages = Math.ceil(totalItems / pageSize) || 1
        const startIndex = (currentPage - 1) * pageSize
        const paginatedOrders = orders.slice(startIndex, startIndex + pageSize)

        return (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-400 text-sm">Loading resident orders...</div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="font-bold text-gray-700 text-sm">No Resident Orders Found</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    There are no resident orders matching your filters for this location.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Order ID & Date</th>
                        <th className="py-3 px-4">Resident / Unit</th>
                        <th className="py-3 px-4">Type & Mode</th>
                        <th className="py-3 px-4">Items / Details</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {paginatedOrders.map((order) => {
                        const resObj = order.resident || order.familyMember?.resident
                        const resName = resObj
                          ? `${resObj.firstName} ${resObj.lastName || ''}`.trim()
                          : order.guestName || 'Resident'
                        const isFam = Boolean(order.familyMemberId)

                        return (
                          <tr key={order.id} className="hover:bg-blue-50/40 transition-colors">
                            {/* Order ID & Date */}
                            <td className="py-3.5 px-4 font-bold text-gray-900">
                              <div className="font-extrabold text-[#005390]">#{order.id.slice(0, 8)}</div>
                              <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                {new Date(order.createdAt).toLocaleString('en-IN', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </div>
                            </td>

                            {/* Resident & Unit */}
                            <td className="py-3.5 px-4">
                              <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                {resName}
                                {isFam && (
                                  <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                                    Family ({order.familyMember?.relation || 'Member'})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-600 font-semibold flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3.5 h-3.5 text-[#005390] shrink-0" />
                                <span>{getFullLocationString(resObj?.unit)}</span>
                              </div>
                            </td>

                            {/* Order Type & Service Type */}
                            <td className="py-3.5 px-4 space-y-1">
                              <div>{getTypeBadge(order)}</div>
                              <div>{getServiceTypeBadge(order.serviceType)}</div>
                            </td>

                            {/* Items Summary */}
                            <td className="py-3.5 px-4">
                              {order.details && order.details.length > 0 ? (
                                <div className="space-y-0.5 max-w-xs">
                                  <div className="font-bold text-gray-800 truncate">
                                    {order.details
                                      .map((d) => d.dish?.name || d.specialMealSlot?.name || 'Item')
                                      .join(', ')}
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    {order.details.length} Line Item{order.details.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Entire Slot Order</span>
                              )}
                            </td>

                            {/* Total Amount */}
                            <td className="py-3.5 px-4">
                              <div className="font-black text-emerald-700 text-sm">
                                ₹{Number(order.totalAmount || 0).toFixed(2)}
                              </div>
                              {order.isPackageCovered && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase">
                                  Package Covered
                                </span>
                              )}
                              {Number(order.deliveryCharge) > 0 && (
                                <div className="text-[10px] text-amber-800 font-semibold mt-0.5">
                                  + ₹{order.deliveryCharge} Delivery
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">{getStatusBadge(order)}</td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-1.5 text-gray-600 hover:text-[#005390] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="View Order Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* 1. Placed -> Accept Order */}
                                {order.orderStatus === 'placed' && (
                                  <button
                                    type="button"
                                    disabled={updatingStatusId === order.id}
                                    onClick={() =>
                                      setConfirmModalData({
                                        order,
                                        nextStatus: 'accepted',
                                        actionLabel: 'Accept Order',
                                      })
                                    }
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#005390] border border-blue-200 text-[10px] font-extrabold rounded-lg cursor-pointer transition-colors"
                                  >
                                    Accept Order
                                  </button>
                                )}

                                {/* 2. Accepted -> Start Preparing */}
                                {order.orderStatus === 'accepted' && (
                                  <button
                                    type="button"
                                    disabled={updatingStatusId === order.id}
                                    onClick={() =>
                                      setConfirmModalData({
                                        order,
                                        nextStatus: 'preparing',
                                        actionLabel: 'Start Preparing',
                                      })
                                    }
                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-extrabold rounded-lg cursor-pointer transition-colors"
                                  >
                                    Start Preparing
                                  </button>
                                )}

                                {/* 3. Preparing -> Food is Ready (Dine In) OR Assign Delivery Employee (Room Service) */}
                                {order.orderStatus === 'preparing' && (
                                  <>
                                    {order.serviceType === 'dine_in' ? (
                                      <button
                                        type="button"
                                        disabled={updatingStatusId === order.id}
                                        onClick={() =>
                                          setConfirmModalData({
                                            order,
                                            nextStatus: 'ready',
                                            actionLabel: 'Food is Ready',
                                          })
                                        }
                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-extrabold rounded-lg cursor-pointer transition-colors"
                                      >
                                        Food is Ready
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmModalData({
                                            order,
                                            nextStatus: 'assign_delivery',
                                            actionLabel: 'Assign Delivery Employee',
                                          })
                                        }
                                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold rounded-lg cursor-pointer transition-colors"
                                      >
                                        Assign Delivery Employee
                                      </button>
                                    )}
                                  </>
                                )}

                                {/* 4. Ready (Dine In) -> Complete Order */}
                                {(order.orderStatus === 'ready' || order.orderStatus === 'food_ready') && (
                                  <button
                                    type="button"
                                    disabled={updatingStatusId === order.id}
                                    onClick={() =>
                                      setConfirmModalData({
                                        order,
                                        nextStatus: 'completed',
                                        actionLabel: 'Complete Order',
                                      })
                                    }
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold rounded-lg cursor-pointer transition-colors"
                                  >
                                    Complete Order
                                  </button>
                                )}

                                {/* 5. Delivering to Room -> Complete Delivery */}
                                {order.orderStatus === 'delivering_to_room' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmModalData({
                                        order,
                                        nextStatus: 'complete_delivery',
                                        actionLabel: 'Complete Delivery',
                                      })
                                    }
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                                  >
                                    <Truck className="w-3 h-3" /> Complete Delivery
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {!loading && orders.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-xs text-xs font-semibold text-gray-600">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <span className="font-extrabold text-gray-900">{startIndex + 1}</span> to{' '}
                    <span className="font-extrabold text-gray-900">{Math.min(startIndex + pageSize, totalItems)}</span>{' '}
                    of <span className="font-extrabold text-gray-900">{totalItems}</span> orders
                  </span>

                  <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                    <span className="text-gray-400 font-medium">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#005390] cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-7 px-2 text-[11px] font-bold rounded-lg border-gray-200 disabled:opacity-40 cursor-pointer"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-gray-200 disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </Button>

                  <span className="px-3 py-1 font-bold text-xs text-[#005390] bg-blue-50 border border-blue-100 rounded-lg">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-gray-200 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-7 px-2 text-[11px] font-bold rounded-lg border-gray-200 disabled:opacity-40 cursor-pointer"
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Confirmation Modal */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#005390] flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-lg text-gray-900">Are you sure?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to change order{' '}
                <strong className="text-gray-900">#{confirmModalData.order.id.slice(0, 8)}</strong> status from{' '}
                <span className="font-bold uppercase text-[#005390] bg-blue-50 px-1.5 py-0.5 rounded">
                  {confirmModalData.order.orderStatus.replace(/_/g, ' ')}
                </span>{' '}
                to{' '}
                <span className="font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {confirmModalData.actionLabel}
                </span>
                ?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModalData(null)}
                className="text-xs font-bold px-5 py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const { order, nextStatus } = confirmModalData
                  setConfirmModalData(null)
                  if (nextStatus === 'assign_delivery') {
                    setAssigningOrder(order)
                    fetchStaffList()
                  } else if (nextStatus === 'complete_delivery') {
                    setCompletingDeliveryOrder(order)
                  } else {
                    handleUpdateStatus(order.id, nextStatus)
                  }
                }}
                className="bg-[#005390] hover:bg-[#004070] text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md cursor-pointer"
              >
                Yes, Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Delivery Employee Modal */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-gray-900">Assign Delivery Employee</h3>
              </div>
              <button
                onClick={() => setAssigningOrder(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-1">
                <span className="text-amber-900 font-extrabold block">Order #{assigningOrder.id.slice(0, 8)}</span>
                <span className="text-amber-800 text-[11px] block">
                  Resident:{' '}
                  {assigningOrder.resident
                    ? `${assigningOrder.resident.firstName} ${assigningOrder.resident.lastName || ''}`
                    : 'Resident'}
                </span>
                <span className="text-amber-700 text-[11px] block font-semibold">
                  Location:{' '}
                  {getFullLocationString(assigningOrder.resident?.unit || assigningOrder.familyMember?.resident?.unit)}
                </span>
              </div>

              {/* Staff Dropdown */}
              <div className="space-y-1">
                <label htmlFor="select-delivery-staff" className="font-extrabold text-gray-700 block">
                  Select Delivery Staff / Employee
                </label>
                <select
                  id="select-delivery-staff"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005390]"
                >
                  <option value="">-- Choose Food Department Staff --</option>
                  {staffList.map((item) => {
                    const u = item as {
                      id: string
                      username?: string
                      email?: string
                      detail?: { firstName?: string; lastName?: string; employeeCode?: string }
                    }
                    const dName = u.detail
                      ? `${u.detail.firstName || ''} ${u.detail.lastName || ''}`.trim()
                      : u.username || u.email
                    const code = u.detail?.employeeCode ? ` (${u.detail.employeeCode})` : ''
                    return (
                      <option key={u.id} value={u.id}>
                        {dName} {code}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Delivery Charge Input */}
              <div className="space-y-1">
                <label htmlFor="delivery-charge-input" className="font-extrabold text-gray-700 block">
                  Delivery Charge (₹)
                </label>
                <input
                  id="delivery-charge-input"
                  type="number"
                  min="0"
                  step="5"
                  value={deliveryChargeInput}
                  onChange={(e) => setDeliveryChargeInput(Number(e.target.value))}
                  placeholder="Enter delivery fee e.g. 20"
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005390]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="ghost" size="sm" onClick={() => setAssigningOrder(null)} className="text-xs font-bold">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submittingAssign}
                onClick={handleAssignDelivery}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 rounded-xl cursor-pointer"
              >
                {submittingAssign ? 'Assigning...' : 'Assign & Start Delivery'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Room Delivery Photo Proof Modal */}
      {completingDeliveryOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-gray-900">Complete Delivery & Upload Proof</h3>
              </div>
              <button
                onClick={() => setCompletingDeliveryOrder(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 space-y-1">
                <span className="text-emerald-900 font-extrabold block">
                  Order #{completingDeliveryOrder.id.slice(0, 8)}
                </span>
                <span className="text-emerald-800 text-[11px] block font-semibold">
                  Location:{' '}
                  {getFullLocationString(
                    completingDeliveryOrder.resident?.unit || completingDeliveryOrder.familyMember?.resident?.unit,
                  )}
                </span>
              </div>

              <div className="space-y-1">
                <label htmlFor="proof-photo-input" className="font-extrabold text-gray-700 block">
                  Proof of Delivery Photo URL
                </label>
                <input
                  id="proof-photo-input"
                  type="text"
                  value={proofPhotoInput}
                  onChange={(e) => setProofPhotoInput(e.target.value)}
                  placeholder="https://.../delivery_proof.jpg"
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-[10px] text-gray-400">
                  Upload photo URL taken by delivery staff upon room handover.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompletingDeliveryOrder(null)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submittingComplete}
                onClick={handleCompleteDelivery}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 rounded-xl cursor-pointer"
              >
                {submittingComplete ? 'Completing...' : 'Confirm Delivery Completed'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#005390]" /> Order Details #{selectedOrder.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-400 font-semibold text-[10px] uppercase">Resident Info</span>
                <div className="font-bold text-gray-900">
                  {selectedOrder.resident
                    ? `${selectedOrder.resident.firstName} ${selectedOrder.resident.lastName || ''}`
                    : selectedOrder.guestName || 'N/A'}
                </div>
                <div className="text-gray-600 font-semibold text-[11px]">
                  {getFullLocationString(selectedOrder.resident?.unit || selectedOrder.familyMember?.resident?.unit)}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-400 font-semibold text-[10px] uppercase">Service & Mode</span>
                <div>{getTypeBadge(selectedOrder)}</div>
                <div className="pt-0.5">{getServiceTypeBadge(selectedOrder.serviceType)}</div>
              </div>
            </div>

            {/* Timestamp Audit Trail Grid */}
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200/80 space-y-2 text-[11px]">
              <span className="text-gray-500 font-black uppercase text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#005390]" /> Status Timestamps & Audit
              </span>
              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div>
                  <span className="text-gray-400 font-semibold block">Accepted At:</span>
                  <span className="font-bold text-gray-800">
                    {selectedOrder.acceptedAt ? new Date(selectedOrder.acceptedAt).toLocaleTimeString('en-IN') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block">Preparing Started:</span>
                  <span className="font-bold text-gray-800">
                    {selectedOrder.preparingStartedAt
                      ? new Date(selectedOrder.preparingStartedAt).toLocaleTimeString('en-IN')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block">Food Ready At:</span>
                  <span className="font-bold text-gray-800">
                    {selectedOrder.readyAt ? new Date(selectedOrder.readyAt).toLocaleTimeString('en-IN') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block">Delivered / Completed:</span>
                  <span className="font-bold text-gray-800">
                    {selectedOrder.deliveredAt ? new Date(selectedOrder.deliveredAt).toLocaleTimeString('en-IN') : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Employee Details (If Room Service) */}
            {selectedOrder.serviceType === 'room_service' && selectedOrder.delivery && (
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 space-y-1.5 text-xs">
                <span className="text-amber-900 font-extrabold uppercase text-[10px] flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-700" /> Room Service Delivery Details
                </span>
                <div className="flex items-center justify-between text-[11px] text-amber-900">
                  <span>
                    Assigned Staff:{' '}
                    <strong className="font-bold">
                      {selectedOrder.delivery.employeeDetail
                        ? `${selectedOrder.delivery.employeeDetail.firstName} ${selectedOrder.delivery.employeeDetail.lastName || ''}`
                        : selectedOrder.delivery.employee?.username || 'Staff'}
                    </strong>
                  </span>
                  <span>
                    Delivery Charge: <strong className="font-bold">₹{selectedOrder.delivery.deliveryCharge}</strong>
                  </span>
                </div>
                {selectedOrder.delivery.photoUrl && (
                  <div className="pt-1">
                    <span className="text-[10px] text-amber-800 font-bold block mb-1">Proof of Delivery Photo:</span>
                    <a href={selectedOrder.delivery.photoUrl} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={selectedOrder.delivery.photoUrl}
                        alt="Delivery Proof"
                        className="w-24 h-24 object-cover rounded-xl border border-amber-300 shadow-xs hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Order Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Ordered Items</h4>
              {selectedOrder.details && selectedOrder.details.length > 0 ? (
                <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  {selectedOrder.details.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-100 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900">
                          {item.dish?.name || item.specialMealSlot?.name || 'Meal Slot Item'}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Qty: <span className="font-bold text-gray-800">{item.quantity}</span> • Unit Price: ₹
                          {item.unitPrice}
                        </div>
                      </div>
                      <div className="font-extrabold text-emerald-700 text-xs">₹{item.amount}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-500 italic bg-gray-50 rounded-xl">
                  Full Meal Slot Order
                </div>
              )}
            </div>

            {/* Order Total & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Total Amount</span>
                <div className="text-lg font-black text-emerald-700">
                  ₹{Number(selectedOrder.totalAmount || 0).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.orderStatus !== 'cancelled' && selectedOrder.orderStatus !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    className="text-xs font-bold text-rose-700 border-rose-200 hover:bg-rose-50 rounded-xl cursor-pointer"
                  >
                    Cancel Order
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                  className="bg-[#005390] hover:bg-[#004070] text-white font-bold text-xs px-4 rounded-xl shadow-xs cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
