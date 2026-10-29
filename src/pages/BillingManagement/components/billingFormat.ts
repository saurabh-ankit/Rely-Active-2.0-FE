import type { BillingServiceType, InvoiceStatus, MonthBillingStatus, PaymentMethod } from '@/lib/types/billing'

export const formatInr = (value: number | null | undefined) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatDay = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Local 'YYYY-MM-DD'. */
export const toDayString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const SERVICE_TYPE_LABEL: Record<BillingServiceType, string> = {
  RENT: 'Rent',
  CARE_PACKAGE: 'Care Package',
  FOOD_PACKAGE: 'Food Package',
  FOOD_ORDER: 'Food Orders',
  ADDITIONAL_TASK: 'Care Services',
  DOCTOR_CONSULTATION: 'Doctor Consultations',
  LAB_TEST: 'Lab Tests',
  INVENTORY_ITEM: 'Medicines & Consumables',
  EVENT_FEE: 'Events',
  VENUE_BOOKING: 'Venue Bookings',
  AMENITY_BOOKING: 'Amenity Bookings',
  MAINTENANCE: 'Maintenance',
  MISCELLANEOUS_AS_SERVICE: 'Miscellaneous',
  MISCELLANEOUS_AT_BILLING: 'Miscellaneous',
  CARRY_FORWARD: 'Carried Forward',
}

/** Rent and packages: billed per period, price editable on the invoice screen. */
export const RECURRING_TYPES: BillingServiceType[] = ['RENT', 'CARE_PACKAGE', 'FOOD_PACKAGE']

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  NET_BANKING: 'Net Banking',
  OTHER: 'Other',
}

/** Payable now: the invoice balance, unless its balance moved to a newer invoice. */
export const isPayable = (status: InvoiceStatus) => ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(status)

/** Opens a generated PDF in a new tab (the URL is fetched first, so open the tab synchronously). */
export const openPdf = async (getUrl: () => Promise<string>) => {
  const tab = window.open('', '_blank')
  try {
    const url = await getUrl()
    if (tab) tab.location.href = url
    else window.open(url, '_blank')
  } catch (error) {
    tab?.close()
    throw error
  }
}

/** Plain-language meaning of each month status, shown on the flats page. */
export const MONTH_STATUS_META: Record<
  MonthBillingStatus,
  { label: string; hint: string; className: string; dotClassName: string }
> = {
  NOT_BILLED: {
    label: 'Not billed',
    hint: 'No invoice yet for this month',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClassName: 'bg-amber-500',
  },
  PENDING: {
    label: 'Awaiting payment',
    hint: 'Invoice sent, nothing paid yet',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClassName: 'bg-blue-500',
  },
  PARTIALLY_PAID: {
    label: 'Partly paid',
    hint: 'Some payment received, balance due',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClassName: 'bg-indigo-500',
  },
  OVERDUE: {
    label: 'Overdue',
    hint: 'Past the due date and not fully paid',
    className: 'bg-red-50 text-red-700 border-red-200',
    dotClassName: 'bg-red-500',
  },
  PAID: {
    label: 'Paid',
    hint: 'Fully paid',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClassName: 'bg-emerald-500',
  },
  CARRIED_FORWARD: {
    label: 'Moved to later invoice',
    hint: 'Balance was carried into a newer invoice',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClassName: 'bg-purple-500',
  },
  NOT_MOVED_IN: {
    label: 'Not moved in',
    hint: 'Residents moved in after this month',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    dotClassName: 'bg-gray-400',
  },
  MOVED_OUT: {
    label: 'Moved out',
    hint: 'All residents had left before this month',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    dotClassName: 'bg-gray-400',
  },
}

/** 'YYYY-MM' → 'October 2026'. */
export const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

/** Every month from `from` to `to` ('YYYY-MM'), newest first. */
export const monthRange = (from: string, to: string) => {
  const months: string[] = []
  let [y, m] = from.split('-').map(Number) as [number, number]
  const [ty, tm] = to.split('-').map(Number) as [number, number]
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months.reverse()
}

/** 'YYYY-MM-DD' / ISO → 'dd/mm/yyyy' (Assist table format). */
export const formatDmy = (value: string | null | undefined) => {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
