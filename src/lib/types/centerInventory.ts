import type { InventoryCategory, InventoryFieldDefinition, InventoryItem, InventoryVendor } from './inventory'
export interface CenterAccess {
  view: boolean
  create: boolean
  update: boolean
  delete: boolean
  approve: boolean
  autoApprove: boolean
}
export type CenterCategory = Omit<InventoryCategory, 'locationIds' | 'fieldDefinitions'> & {
  fieldDefinitions?: InventoryFieldDefinition[]
}
export interface CenterItem extends Omit<InventoryItem, 'locationIds' | 'vendorAssignments'> {
  quantity: number
  stockDisplay: string
  wholePackagesOnly: boolean
  suppliers: InventoryVendor[]
  batches?: ReceiptLine[]
}
export interface CenterStats {
  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  expiringSoon: number
  totalValue: number
  totalPurchases: number
  totalIssues: number
  totalTransactions: number
}
export type POStatus =
  'draft' | 'approval_pending' | 'approved' | 'rejected' | 'pending' | 'partially_received' | 'received' | 'cancelled'
export interface PackageSnapshot {
  itemId: string
  itemName: string
  packType: string
  packUnit: string
  packQuantity: number
}
export interface POLine extends PackageSnapshot {
  id: string
  orderedQuantity: number
  receivedQuantity: number
  remainingQuantity: number
  agreedPrice: number
  orderedDisplay: string
  receivedDisplay: string
}
export interface PurchaseOrder {
  id: string
  locationId: string
  supplierId: string
  supplier?: InventoryVendor
  poNumber: string
  status: POStatus
  notes: string | null
  createdAt: string
  totalAmount: number
  itemCount?: number
  items: POLine[]
  receipts: StockTransaction[]
}
export interface ReceiptLine extends PackageSnapshot {
  mrpAmount?: number | null
  remainingQuantity?: number
  receiptLineId?: string | null
  id: string
  transactionId: string
  quantity: number
  stockDisplay: string
  unitCost: number
  mrpPrice: number
  batchNumber: string | null
  transitId: string | null
  receivedDate: string
  manufacturedDate: string | null
  expiryDate: string | null
}
export interface StockTransaction {
  id: string
  transactionNumber: string
  locationId: string
  supplierId: string | null
  transactionType: 'purchase' | 'issue'
  residentId?: string | null
  assignedUserId?: string | null
  recipientName?: string | null
  mrpAmount: number | null
  supplier?: InventoryVendor
  purchaseOrderId: string | null
  poNumber?: string | null
  date: string
  createdAt: string
  notes: string | null
  totalAmount: number
  itemCount?: number
  items: ReceiptLine[]
}
export interface PurchaseOrderInput {
  requestId: string
  supplierId: string
  notes: string | null
  items: { itemId: string; orderedQuantity: number; agreedPrice: number }[]
}
export interface ReceiptInput {
  requestId: string
  supplierId?: string
  date: string
  notes: string | null
  stockEntries: {
    itemId: string
    quantity: number
    unitCost: number
    mrpPrice: number
    transitId: string | null
    receivedDate: string
    manufacturedDate: string | null
    expiryDate: string | null
    batchNumber: string | null
  }[]
}
export interface CenterSupplier extends InventoryVendor {
  purchaseOrderCount: number
}
export interface SupplierListResponse {
  records: CenterSupplier[]
  pagination: { page: number; limit: number; totalItems: number; totalPages: number }
  summary: { totalSuppliers: number; activeSuppliers: number; inactiveSuppliers: number; totalPurchaseOrders: number }
}
export interface CenterListParams {
  isActive?: string
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  supplierId?: string
  itemId?: string
  status?: string
  stockFilter?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}
export interface CenterLists {
  categories: CenterCategory
  items: CenterItem
  suppliers: InventoryVendor
  'purchase-orders': PurchaseOrder
  transactions: StockTransaction
}
export const poStatusLabels: Record<POStatus, string> = {
  draft: 'Draft',
  approval_pending: 'Awaiting Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
  partially_received: 'Partially Received',
  received: 'Received',
  cancelled: 'Cancelled',
}

export interface AssignmentRecipient {
  id: string
  name: string
  type: 'resident' | 'staff'
}
export interface AssignmentInput {
  requestId: string
  residentId?: string
  assignedUserId?: string
  date: string
  notes: string | null
  items: { itemId: string; quantity: number }[]
}
export interface AssignmentPreview {
  mrpAmount: number
  items: { itemId: string; quantity: number; availableQuantity: number; remainingQuantity: number; mrpAmount: number }[]
}
