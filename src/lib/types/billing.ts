export type BillingMode = 'INDIVIDUAL' | 'UNIT_CONSOLIDATED'
export type BillingAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'

export type BillingPartyType = 'RESIDENT' | 'FAMILY_MEMBER' | 'GUARDIAN' | 'ORGANIZATION' | 'OTHER'
export type BillingPartyRole = 'PRIMARY_PAYER' | 'SECONDARY_PAYER' | 'AUTHORIZED_CONTACT'

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED'
export type ProrationPolicy = 'DAILY' | 'FULL_MONTH' | 'NO_PRORATION'

export type BillingEventSourceModule =
  'FNB' | 'CARE' | 'TRANSPORT' | 'ACTIVITY' | 'INVENTORY' | 'HOUSEKEEPING' | 'MANUAL' | 'SYSTEM'
export type BillingEventStatus = 'PENDING' | 'INVOICED' | 'CANCELLED'

export type InvoiceType = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE'
export type InvoiceStatus =
  'DRAFT' | 'PREVIEW' | 'FINALIZED' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'OVERDUE'
export type InvoiceLineType = 'SUBSCRIPTION' | 'USAGE' | 'DISCOUNT' | 'TAX' | 'ADJUSTMENT'

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'NEFT' | 'RTGS' | 'CARD' | 'OTHER'
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REVERSED'

export interface PaymentAllocationItem {
  invoiceId: string
  amount: number
}

export interface PaymentAllocation {
  id: string
  paymentId: string
  invoiceId: string
  amount: number
  createdAt: string
  invoice?: Partial<Invoice>
}

export interface Payment {
  id: string
  paymentNumber: string
  billingAccountId: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  transactionReference?: string | null
  bankName?: string | null
  chequeNumber?: string | null
  status: PaymentStatus
  notes?: string | null
  performedBy?: string | null
  createdAt: string
  updatedAt: string
  allocations?: PaymentAllocation[]
}

export interface RecordPaymentPayload {
  billingAccountId: string
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  transactionReference?: string | null
  bankName?: string | null
  chequeNumber?: string | null
  notes?: string | null
  allocations: PaymentAllocationItem[]
}

export interface RecordPaymentResponse {
  payment: Payment
  allocations: PaymentAllocation[]
  updatedInvoices: Invoice[]
}

export type BillingRunType = 'SCHEDULED' | 'MANUAL' | 'PREVIEW'
export type BillingRunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export type LedgerEntryType = 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'CREDIT_APPLIED' | 'REFUND'

export interface BillingParty {
  id: string
  billingAccountId: string
  partyType: BillingPartyType
  residentId?: string | null
  familyMemberId?: string | null
  partyName: string
  partyEmail?: string | null
  partyPhone?: string | null
  partyAddress?: string | null
  partyGstin?: string | null
  role: BillingPartyRole
  isDefault: boolean
  isActive: boolean
}

export interface BillingAccount {
  id: string
  accountNumber: string
  unitId: string
  propertyId: string
  companyId: string
  primaryResidentId?: string | null
  accountName: string
  billingMode: BillingMode
  status: BillingAccountStatus
  billingCycle: BillingCycle
  billingDay: number
  currency: string
  creditBalance: number
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  unit?: {
    id: string
    unit_number: string
    unit_type?: string
  }
  primaryResident?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
  }
  parties?: BillingParty[]
}

export interface BillingSubscription {
  id: string
  billingAccountId: string
  unitId: string
  productId: string
  description?: string | null
  quantity: number
  unitPrice: number
  billingFrequency: BillingCycle
  prorationPolicy: ProrationPolicy
  startDate: string
  endDate?: string | null
  status: SubscriptionStatus
  pauseStart?: string | null
  pauseEnd?: string | null
  isActive: boolean
  product?: {
    id: string
    productCode: string
    productName: string
    category: string
  }
}

export interface BillingEvent {
  id: string
  billingAccountId: string
  unitId: string
  residentId: string
  propertyId: string
  sourceModule: BillingEventSourceModule
  sourceType: string
  chargeType: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
  serviceDate: string
  occurredAt: string
  status: BillingEventStatus
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

export interface InvoiceLine {
  id: string
  invoiceId: string
  subscriptionId?: string | null
  billingEventId?: string | null
  productId?: string | null
  lineType: InvoiceLineType
  chargeType: string
  description: string
  serviceDate?: string | null
  consumedByResidentId?: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  discountAmount: number
  taxableAmount: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  sortOrder: number
  consumedByResident?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface Invoice {
  id: string
  invoiceNumber: string
  billingAccountId: string
  unitId: string
  residentId?: string | null
  propertyId: string
  companyId: string
  invoiceType: InvoiceType
  referenceInvoiceId?: string | null
  billToName: string
  billToEmail?: string | null
  billToPhone?: string | null
  billToAddress?: string | null
  billToGstin?: string | null
  periodStart: string
  periodEnd: string
  issueDate: string
  dueDate: string
  subtotal: number
  discountTotal: number
  discountNote?: string | null
  taxableAmount: number
  taxTotal: number
  roundingAdjustment: number
  grandTotal: number
  amountPaid: number
  amountDue: number
  status: InvoiceStatus
  finalizedAt?: string | null
  paidAt?: string | null
  currency: string
  pdfUrl?: string | null
  createdAt: string
  updatedAt: string
  lines?: InvoiceLine[]
  billingAccount?: BillingAccount
  unit?: {
    id: string
    unit_number: string
  }
}

export interface BillingLedgerEntry {
  id: string
  billingAccountId: string
  unitId: string
  entryType: LedgerEntryType
  referenceType: string
  referenceId: string
  debitAmount: number
  creditAmount: number
  runningBalance: number
  description: string
  entryDate: string
  createdAt: string
}

export interface BillingLedgerStatement {
  accountId: string
  creditBalance: number
  entries: BillingLedgerEntry[]
}

export interface BillingRun {
  id: string
  propertyId: string
  companyId: string
  billingPeriodStart: string
  billingPeriodEnd: string
  runType: BillingRunType
  status: BillingRunStatus
  totalAccounts: number
  successfulInvoices: number
  failedInvoices: number
  totalAmount: number
  startedAt?: string | null
  completedAt?: string | null
  runBy?: string | null
  createdAt: string
}

export interface UnitBillingSummary {
  unitId: string
  id?: string
  unitNumber: string
  unitType: string
  occupancyStatus: string
  floorNumber?: number
  blockName?: string
  residents: Array<{
    id: string
    name: string
    phone?: string
    email?: string
    relationship: string
    isPrimary: boolean
  }>
  primaryResident: {
    id: string
    name: string
    phone?: string
    email?: string
    relationship: string
  } | null
  folio: {
    id: string
    accountNumber: string
    accountName: string
    billingMode: string
    status: string
    creditBalance: number
  } | null
  primaryPayer: {
    id: string
    name: string
    email?: string
    phone?: string
    role: string
  } | null
  financialMetrics: {
    totalInvoiced: number
    totalOutstanding: number
    activeSubscriptionsCount: number
    invoicesCount: number
    pendingEventsCount?: number
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
  }>
  folio: BillingAccount | null
  subscriptions: BillingSubscription[]
  invoices: Invoice[]
  pendingEvents: BillingEvent[]
  ledger: {
    creditBalance: number
    entries: BillingLedgerEntry[]
  }
}
