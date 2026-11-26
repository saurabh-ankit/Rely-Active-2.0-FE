import type { ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The fields the board needs; the orders tab passes its full order objects. */
export interface BoardOrder {
  id: string
  orderStatus: string
  createdAt: string
  totalAmount: number
  isPackageCovered: boolean
  guestName?: string | null
  serviceType?: string
}

/** Board columns, left to right in the order an order moves through them. */
const COLUMNS: { key: string; label: string; statuses: string[]; tone: string }[] = [
  { key: 'placed', label: 'Placed', statuses: ['placed'], tone: 'bg-amber-500' },
  { key: 'accepted', label: 'Accepted', statuses: ['accepted'], tone: 'bg-[#005390]' },
  { key: 'preparing', label: 'Preparing', statuses: ['preparing'], tone: 'bg-purple-500' },
  { key: 'ready', label: 'Ready', statuses: ['ready', 'food_ready'], tone: 'bg-indigo-500' },
  { key: 'delivering', label: 'Delivering', statuses: ['delivering_to_room'], tone: 'bg-orange-500' },
  { key: 'completed', label: 'Completed', statuses: ['completed', 'delivered'], tone: 'bg-emerald-500' },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'], tone: 'bg-rose-500' },
]

const columnOf = (status: string) => {
  const s = (status || 'placed').toLowerCase()
  return COLUMNS.find((c) => c.statuses.includes(s))?.key ?? 'placed'
}

interface FnbOrdersBoardProps<T extends BoardOrder> {
  orders: T[]
  residentName: (order: T) => string
  unitLabel: (order: T) => string
  /** The tab's own clickable status badge (advances the order through its confirm flow). */
  statusBadge: (order: T) => ReactNode
  typeBadge: (order: T) => ReactNode
  onOpen: (order: T) => void
}

/**
 * Kanban view of resident orders. Cards share a LayoutGroup and are keyed by order id, so when an order's
 * status changes its card glides from one column to the next instead of jumping.
 */
export function FnbOrdersBoard<T extends BoardOrder>({
  orders,
  residentName,
  unitLabel,
  statusBadge,
  typeBadge,
  onOpen,
}: FnbOrdersBoardProps<T>) {
  const byColumn = new Map(COLUMNS.map((c) => [c.key, [] as T[]]))
  for (const order of orders) byColumn.get(columnOf(order.orderStatus))!.push(order)
  // Cancelled only earns a column when there is something in it
  const columns = COLUMNS.filter((c) => c.key !== 'cancelled' || byColumn.get('cancelled')!.length > 0)

  return (
    <LayoutGroup id="fnb-orders-board">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const items = byColumn.get(column.key)!
          return (
            <section
              key={column.key}
              aria-label={`${column.label} orders`}
              className="flex w-64 shrink-0 flex-col rounded-2xl border border-gray-200 bg-gray-50/70"
            >
              <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-gray-700 uppercase">
                  <span className={cn('size-2 rounded-full', column.tone)} />
                  {column.label}
                </span>
                <motion.span
                  key={items.length}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-gray-600 tabular-nums shadow-2xs"
                >
                  {items.length}
                </motion.span>
              </header>
              <div className="flex max-h-[60vh] min-h-24 flex-col gap-2 overflow-y-auto p-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {items.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      layoutId={`order-${order.id}`}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      role="button"
                      tabIndex={0}
                      // Clicks on the status badge run its own action, not "open details"
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button')) onOpen(order)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onOpen(order)}
                      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-2xs transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#005390]">#{order.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate font-bold text-gray-900">{residentName(order)}</p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-gray-500">
                        <MapPin className="size-3 shrink-0" />
                        {unitLabel(order)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">{typeBadge(order)}</div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                        <span className="font-black text-emerald-700">
                          ₹{Number(order.totalAmount || 0).toFixed(2)}
                          {order.isPackageCovered && (
                            <span className="ml-1 text-[9px] font-bold text-emerald-700 uppercase">· Pkg</span>
                          )}
                        </span>
                        {statusBadge(order)}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {items.length === 0 && (
                  <p className="py-6 text-center text-[11px] font-medium text-gray-400">No orders</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
