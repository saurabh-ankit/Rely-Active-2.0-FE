export type BillingMode = 'MONTHLY'

export type ServiceType = 'food_package' | 'food_orders' | 'monthly_rents'

export type InvoiceStatus =
  'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED' | 'OVERDUE' | 'OBSOLETE' | 'CARRY_FORWARDED'

export type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE' | 'CARD' | 'NET_BANKING' | 'OTHER'

export interface ServicesInvoice {
  id: string
  invoiceId: string
  serviceType: ServiceType | string
  amount: number
  tax: number
  discount: number
  notes?: string | null
}

export interface Receipt {
  id: string
  invoiceId: string
  residentId?: string | null
  unitId?: string | null
  loc_id: string
  receiptNumber: string
  paidAmount: number
  paymentDate: string
  paymentMethod: PaymentMethod | string
  paymentReference?: string | null
  receivedByUserId?: string | null
  notes?: string | null
  createdAt?: string
}

export interface MiscellaneousBilling {
  id: string
  invoiceId: string
  unitId?: string | null
  description: string
  amount: number
  tax: number
  discount: number
  notes?: string | null
}

export interface UnitMiscellaneousItem {
  id: string
  residentId?: string | null
  unitId?: string | null
  loc_id: string
  employeeId?: string | null
  itemName: string
  totalQuantity: number
  quantityTaken: number
  unitPrice: number
  price: number
  unit: string
  date: string
  time: string
  notes?: string | null
  createdAt?: string
}

export type BillingEventSourceModule =
  'MANUAL' | 'HOUSEKEEPING' | 'FNB' | 'TRANSPORT' | 'INVENTORY' | 'CARE' | 'ACTIVITY' | string
export type BillingEventStatus = 'PENDING' | 'INVOICED' | 'CANCELLED' | string

export interface BillingEvent {
  id: string
  billingAccountId?: string
  unitId?: string
  residentId?: string
  propertyId?: string
  sourceModule?: BillingEventSourceModule
  sourceType?: string
  chargeType?: string
  description?: string
  quantity?: number
  unitPrice?: number
  amount?: number
  serviceDate?: string
  occurredAt?: string
  status?: BillingEventStatus
  invoiceId?: string | null
  attachments?: Array<{ name: string; url: string; contentType?: string; size?: number }> | null
  resident?: {
    id: string
    firstName: string
    lastName: string
  }
  unit?: {
    id: string
    unit_number: string
  }
}

export interface Invoice {
  id: string
  invoiceNumber: string
  residentId?: string | null
  unitId?: string | null
  loc_id: string
  startDate: string
  endDate: string
  subtotal: number
  tax: number
  discount: number
  discountPercentage?: number | null
  discountAmount?: number | null
  total: number
  grandTotal?: number
  discountedAmount: number
  currency: string
  status: InvoiceStatus
  billingMode: BillingMode
  dueDate?: string | null
  paidAmount: number
  amountPaid?: number
  amountDue?: number
  paymentMethod?: PaymentMethod | string | null
  paymentReference?: string | null
  notes?: string | null
  invoiceData?: Record<string, unknown> | null
  isFinalBill?: boolean
  depositDeduction?: number
  advanceDeduction?: number
  refundAmount?: number
  netRefundDue?: number
  refundNote?: string | null
  banking_on?: 'location' | 'company'
  createdAt?: string
  updatedAt?: string
  services?: ServicesInvoice[]
  miscellaneousItems?: MiscellaneousBilling[]
  receipts?: Receipt[]
  resident?: {
    id: string
    firstName: string
    lastName: string
  }
  unit?: {
    id: string
    unit_number: string
    unit_type?: string
  }
}

export interface CreateInvoicePayload {
  residentId?: string
  unitId?: string
  loc_id: string
  startDate: string
  endDate: string
  dueDate?: string
  billingMode?: 'MONTHLY'
  notes?: string
  services?: Array<{
    serviceType: ServiceType | string
    amount: number
    tax?: number
    discount?: number
    notes?: string
  }>
  miscellaneousItems?: Array<{
    description: string
    amount: number
    tax?: number
    discount?: number
    notes?: string
  }>
}

export interface CreatePaymentPayload {
  invoiceId: string
  paidAmount: number
  paymentDate?: string
  paymentMethod: PaymentMethod | string
  paymentReference?: string
  notes?: string
}

export interface CreateMiscellaneousServicePayload {
  residentId?: string
  unitId?: string
  loc_id?: string
  employeeId?: string
  itemName: string
  totalQuantity?: number
  unitPrice: number
  price?: number
  unit?: string
  date?: string
  time?: string
  notes?: string
}

export interface UnitBillingSummary {
  unitId: string
  id?: string
  unitNumber: string
  unitType?: string
  occupancyStatus?: string
  floorNumber?: number
  blockName?: string
  moveInDate?: string | null
  primaryPayer?: {
    name?: string
    role?: string
  } | null
  folio?: {
    accountNumber?: string
    creditBalance?: number
  } | null
  residents?: Array<{
    id: string
    name: string
    phone?: string
    email?: string
    relationship?: string
    isPrimary?: boolean
    isFamilyMember?: boolean
    parentResidentName?: string
    moveInDate?: string | null
  }>
  primaryResident?: {
    id: string
    name: string
    phone?: string
    email?: string
    relationship?: string
    moveInDate?: string | null
  } | null
  financialMetrics?: {
    totalInvoiced?: number
    totalCollected?: number
    totalOutstanding?: number
    invoicesCount?: number
    receiptsCount?: number
    miscellaneousItemsCount?: number
  }
}

export interface UnitBilling360 {
  unit: {
    id: string
    unitNumber: string
    unitType: string
    occupancyStatus: string
    floorNumber?: number
    blockName?: string
  }
  occupants: Array<{
    id: string
    name: string
    email?: string
    phone?: string
    relationship: string
    isPrimary: boolean
    photoUrl?: string
    moveInDate?: string | null
  }>
  invoices: Invoice[]
  receipts: Receipt[]
  services: ServicesInvoice[]
  miscellaneousItems: UnitMiscellaneousItem[]
  summary: {
    totalInvoiced: number
    totalCollected: number
    totalOutstanding: number
  }
}
