// Flat billing (ported from Rely Assist). An invoice is computed from the source modules
// for a date range and saved as a snapshot of service lines.

export type BillingMode = 'MONTHLY' | 'CUSTOM'

export type InvoiceStatus =
  'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED' | 'OVERDUE' | 'OBSOLETE' | 'CARRY_FORWARDED'

export type BillingServiceType =
  | 'RENT'
  | 'CARE_PACKAGE'
  | 'FOOD_PACKAGE'
  | 'FOOD_ORDER'
  | 'ADDITIONAL_TASK'
  | 'DOCTOR_CONSULTATION'
  | 'LAB_TEST'
  | 'INVENTORY_ITEM'
  | 'EVENT_FEE'
  | 'VENUE_BOOKING'
  | 'MAINTENANCE'
  | 'MISCELLANEOUS_AS_SERVICE'
  | 'MISCELLANEOUS_AT_BILLING'
  | 'CARRY_FORWARD'

export type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE' | 'CARD' | 'NET_BANKING' | 'OTHER'

export interface BillingPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BillTo {
  residentId: string | null
  name: string
  phone: string | null
  email: string | null
  unitNumber: string
}

/** A line on the invoice screen before it is saved. */
export interface PreviewService {
  id: string
  serviceType: BillingServiceType
  name: string
  description: string
  quantity: number
  price: number
  total: number
  residentId: string | null
  /** Who used it: the resident or a family member, by name. */
  consumerType: 'RESIDENT' | 'FAMILY_MEMBER' | null
  consumerName: string | null
  serviceStartDate: string
  serviceEndDate: string
  date: string
  isAdjustment: boolean
  /** Old flat the charge was used in, when the resident has since moved here. */
  fromUnitId: string | null
  fromUnitNumber: string | null
}

export interface PendingInvoiceSummary {
  id: string
  invoiceNumber: string
  startDate: string
  endDate: string
  total: number
  paidAmount: number
  balance: number
  status: InvoiceStatus
  /**
   * Carried into the new invoice automatically: this flat's pending ones (nothing paid), and every
   * unpaid invoice of a flat the residents moved here from (for what is left on it).
   */
  carryForward: boolean
  /** Old flat it was raised on, when the residents brought it along after moving here. */
  fromUnitId: string | null
  fromUnitNumber: string | null
}

export interface InvoicePreview {
  unitId: string
  unitNumber: string
  propertyId: string
  billingMode: BillingMode
  startDate: string
  endDate: string
  services: PreviewService[]
  subtotal: number
  total: number
  currency: string
  billTo: BillTo
  residents: { id: string; name: string; residentType: string; isResiding: boolean; phone: string | null }[]
  familyMembers: {
    id: string
    name: string
    relation: string
    phone: string | null
    isResiding: boolean
    residentId: string
  }[]
  /** First move-in day of the flat's billed residents; the first bill starts here. */
  movedInDate: string | null
  /** Days the rent / package lines cover, and the days the service lines were used on. */
  recurringPeriod: { from: string; to: string }
  /** Null for a first bill: no previous month to bill services for. */
  servicesPeriod: { from: string; to: string } | null
  /** GST applied on the total after discount (CGST + SGST). */
  tax: { gstEnabled: boolean; rate: number; cgstRate: number; sgstRate: number }
  nextBillableStartDate: string
  pendingInvoices: PendingInvoiceSummary[]
  overlappingInvoice: { id: string; invoiceNumber: string; startDate: string; endDate: string } | null
  /** Flats the residents lived in before this one, with the last day there. */
  previousFlats: { unitId: string; unitNumber: string; lastDay: string }[]
}

export interface InvoiceServiceLine {
  id: string
  serviceType: BillingServiceType
  name: string
  description: string | null
  quantity: number
  price: number
  total: number
  residentId: string | null
  /** Who used it: the resident or a family member, by name. */
  consumerType: 'RESIDENT' | 'FAMILY_MEMBER' | null
  consumerName: string | null
  sourceId: string | null
  serviceStartDate: string | null
  serviceEndDate: string | null
  isAdjustment: boolean
  /** Old flat the charge was used in (carried over after the resident moved). */
  fromUnitId: string | null
  fromUnitNumber: string | null
}

/** Where part of a payment went: the paid invoice's own charges, or an older invoice carried into it. */
export interface ReceiptAppliedTo {
  invoiceId: string
  invoiceNumber: string | null
  startDate: string | null
  endDate: string | null
  status: InvoiceStatus | null
  carried: boolean
  amount: number
}

/** An older invoice carried into this one and how much of it is paid so far. */
export interface CarriedInInvoice {
  invoiceId: string
  invoiceNumber: string | null
  startDate: string | null
  endDate: string | null
  status: InvoiceStatus | null
  carriedAmount: number
  paidAmount: number
}

export interface InvoiceReceiptSummary {
  id: string
  receiptNumber: string
  paidAmount: number
  paymentMethod: PaymentMethod
  paymentReference: string | null
  createdAt: string
  invoiceStatus: InvoiceStatus | null
  /** Invoice total, paid before this payment, and still owed after it. */
  invoiceTotal: number | null
  paidBefore: number | null
  invoiceRemainingBalance: number | null
  appliedTo: ReceiptAppliedTo[]
  pdfUrl: string | null
}

export interface Invoice {
  id: string
  invoiceNumber: string
  unitId: string
  unitNumber: string | null
  propertyId: string
  startDate: string
  endDate: string
  subtotal: number
  tax: number
  discount: number
  discountPercentage: number | null
  discountAmount: number | null
  discountReason: string | null
  /** GST on (subtotal − discount); null when GST was off. */
  gst: {
    gstNumber: string | null
    rate: number
    cgstRate: number
    sgstRate: number
    taxable: number
    cgst: number
    sgst: number
  } | null
  /** Older invoices' balances carried into this one (outside discount and GST). */
  carriedForwardAmount: number
  total: number
  discountedAmount: number
  /** Still owed; 0 once paid or carried into a newer invoice. */
  remainingBalance: number
  currency: string
  status: InvoiceStatus
  billingMode: BillingMode
  dueDate: string | null
  paidAmount: number
  paymentMethod: PaymentMethod | null
  paymentReference: string | null
  notes: string | null
  billTo: BillTo | null
  /** Set when this invoice's balance was carried into a newer invoice. */
  carriedForwardTo: { invoiceId: string; invoiceNumber: string; amount: number; paidAmount: number } | null
  carriedIn: CarriedInInvoice[]
  createdAt: string
  updatedAt: string
  pdfUrl: string | null
  services: InvoiceServiceLine[]
  miscellaneousItems: {
    id: string
    name: string
    description: string | null
    quantity: number
    price: number
    total: number
  }[]
  receipts: InvoiceReceiptSummary[]
}

export interface ReceiptListItem {
  id: string
  receiptId: string
  receiptNumber: string
  pdfUrl: string | null
  paidAmount: number
  paymentMethod: PaymentMethod
  paymentReference: string | null
  notes: string | null
  receiptCreatedAt: string
  imageUrl: string | null
  handedOverTo: { id: string; firstName: string; lastName: string } | null
  invoiceStatus: InvoiceStatus | null
  invoiceTotal: number | null
  paidBefore: number | null
  invoiceRemainingBalance: number | null
  appliedTo: ReceiptAppliedTo[]
  invoiceId: string
  invoiceNumber: string | null
  /** Flat the invoice was raised on */
  unitNumber: string | null
  /** Paid on a flat the residents moved here from */
  fromPreviousFlat: boolean
  startDate: string | null
  endDate: string | null
  status: InvoiceStatus | null
  discountedAmount: number | null
  invoicePaidAmount: number | null
}

/** Where a flat stands for the selected month. */
export type MonthBillingStatus =
  'NOT_MOVED_IN' | 'MOVED_OUT' | 'NOT_BILLED' | 'PENDING' | 'PARTIALLY_PAID' | 'OVERDUE' | 'PAID' | 'CARRIED_FORWARD'

export interface BillingUnit {
  id: string
  unitNumber: string
  blockName: string | null
  floorNumber: number | null
  residents: { id: string; name: string; residentType: string; isResiding: boolean; phone: string | null }[]
  movedInDate: string | null
  movedOutDate: string | null
  month: {
    status: MonthBillingStatus
    invoices: {
      id: string
      invoiceNumber: string
      /** Set when the invoice was raised on a flat the household moved here from */
      fromUnitNumber: string | null
      startDate: string
      endDate: string
      dueDate: string | null
      status: InvoiceStatus
    }[]
    billed: number
    paid: number
    balance: number
    partlyBilled: boolean
  }
  lastBilledUntil: string | null
  outstanding: number
}

export interface BillingUnitsResponse {
  month: string
  earliestMonth: string
  units: BillingUnit[]
  summary: { counts: Record<MonthBillingStatus, number>; billed: number; collected: number; outstanding: number }
  pagination: BillingPagination
}

export interface MiscellaneousServiceInput {
  id?: string
  name: string
  description?: string | null
  quantity: number
  price: number
  isCarryForward?: boolean
  originalInvoiceId?: string | null
}

export interface SaveInvoicePayload {
  billingMode: BillingMode
  startDate?: string
  endDate?: string
  selectedServices: string[]
  miscellaneousServices?: MiscellaneousServiceInput[]
  carriedForwardInvoiceIds?: string[]
  discountType?: 'percentage' | 'amount' | null
  discountValue?: number | null
  discountReason?: string | null
  dueDate?: string | null
  notes?: string | null
}

export interface RecordPaymentPayload {
  paidAmount: number
  paymentMethod: PaymentMethod
  paymentReference?: string
  notes?: string
  handedOverTo?: string
  imageUrl?: string
}

export interface UnitMiscItem {
  id: string
  unitId: string
  residentId: string | null
  name: string
  description: string | null
  quantity: number
  price: number
  total: number
  serviceDate: string
  attachmentUrl: string | null
  billedOnInvoice: string | null
}

export interface CreateMiscItemPayload {
  unitId: string
  residentId?: string | null
  name: string
  description?: string | null
  quantity: number
  price: number
  serviceDate: string
  attachmentUrl?: string | null
}

export interface TaxSettings {
  gstEnabled: boolean
  defaultGstRate: number
  cgstRate: number
  sgstRate: number
  companyGstNumber: string
}
