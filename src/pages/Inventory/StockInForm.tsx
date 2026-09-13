import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowDownLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { FieldGroup } from '@/components/ui/field'
import { useCenterOptions, useCenterMutation } from '@/hooks/react-query/centerInventory'
import type { PurchaseOrder, ReceiptInput, StockTransaction } from '@/lib/types/centerInventory'
import { ErrorNotice, FormField } from './shared'
import { baseQuantity, today, quantityDisplay } from './utils'
const newLine = () => ({
  key: crypto.randomUUID(),
  itemId: '',
  packages: 0,
  unitCost: 0,
  mrpPrice: 0,
  batchNumber: '',
  transitId: '',
  receivedDate: today(),
  manufacturedDate: '',
  expiryDate: '',
})
export function StockInForm({
  locationId,
  categoryId,
  po,
  onClose,
  onSaved,
}: {
  locationId: string
  categoryId?: string
  po?: PurchaseOrder
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const suppliers = useCenterOptions(locationId, 'suppliers')
  const items = useCenterOptions(locationId, 'items', po || !categoryId ? {} : { categoryId })
  const mutation = useCenterMutation<StockTransaction>(locationId)
  const [requestId] = useState(() => crypto.randomUUID())
  const [supplierId, setSupplierId] = useState(po?.supplierId ?? '')
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [lines, setLines] = useState(() =>
    po
      ? po.items
          .filter((i) => i.remainingQuantity > 0)
          .map((i) => ({ ...newLine(), itemId: i.itemId, packages: 0, unitCost: Number(i.agreedPrice) }))
      : [newLine()],
  )
  const eligible = (items.data ?? []).filter(
    (i) =>
      i.isActive &&
      i.suppliers.some((s) => s.id === supplierId && s.isActive) &&
      (!po || po.items.some((l) => l.itemId === i.id && l.remainingQuantity > 0)),
  )
  const update = (index: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl rounded-3xl p-6 shadow-2xl border border-gray-100">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">{po ? `Stock In — ${po.poNumber}` : 'Stock In'}</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {po
                  ? 'Enter received quantities. Leave unreceived items at zero.'
                  : 'Record stock received from a vendor.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form
          className="flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            try {
              const received = lines.filter((l) => l.packages > 0)
              if (!received.length) throw new Error('Enter at least one received quantity')
              if (!po && received.length !== lines.length) throw new Error('Complete or remove empty receipt lines')
              const input: ReceiptInput = {
                requestId,
                supplierId,
                date,
                notes: notes || null,
                stockEntries: received.map((l) => {
                  const item = eligible.find((i) => i.id === l.itemId)
                  if (!item) throw new Error('Select an item supplied by this vendor')
                  return {
                    itemId: l.itemId,
                    quantity: baseQuantity(l.packages, item.packQuantity),
                    unitCost: l.unitCost,
                    mrpPrice: l.mrpPrice,
                    batchNumber: l.batchNumber || null,
                    transitId: l.transitId || null,
                    receivedDate: l.receivedDate,
                    manufacturedDate: l.manufacturedDate || null,
                    expiryDate: l.expiryDate || null,
                  }
                }),
              }
              const receipt = await mutation.mutateAsync({
                path: po ? `purchase-orders/${po.id}/receive` : 'stock-in',
                data: input,
              })
              toast.success('Stock received')
              onSaved(receipt.id)
            } catch (err) {
              setError(err)
            }
          }}
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="receipt-supplier" label="Vendor *">
                <NativeSelect
                  id="receipt-supplier"
                  value={supplierId}
                  disabled={!!po}
                  required
                  onChange={(e) => {
                    setSupplierId(e.target.value)
                    setLines([newLine()])
                  }}
                >
                  <NativeSelectOption value="">Select vendor</NativeSelectOption>
                  {suppliers.data
                    ?.filter((s) => s.isActive || s.id === po?.supplierId)
                    .map((s) => (
                      <NativeSelectOption value={s.id} key={s.id}>
                        {s.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </FormField>
              <FormField id="receipt-date" label="Transaction Date *">
                <Input id="receipt-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </FormField>
            </div>
            {lines.map((line, index) => {
              const item = eligible.find((i) => i.id === line.itemId)
              const orderLine = po?.items.find((l) => l.itemId === line.itemId)
              return (
                <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3" key={line.key}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Item Entry #{index + 1}
                    </span>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer h-7 px-2"
                        onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {orderLine && (
                    <div className="rounded-xl bg-blue-50/70 border border-blue-100 px-3 py-1.5 text-xs text-blue-700 font-medium">
                      Ordered: <span className="font-bold">{orderLine.orderedDisplay}</span> · Received:{' '}
                      <span className="font-bold">{orderLine.receivedDisplay}</span> · Remaining:{' '}
                      <span className="font-bold">{quantityDisplay(orderLine.remainingQuantity, orderLine)}</span>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField id={`receipt-item-${index}`} label="Item *">
                      <NativeSelect
                        id={`receipt-item-${index}`}
                        required
                        value={line.itemId}
                        onChange={(e) => update(index, { itemId: e.target.value })}
                      >
                        <NativeSelectOption value="">Select item</NativeSelectOption>
                        {eligible.map((i) => (
                          <NativeSelectOption value={i.id} key={i.id}>
                            {i.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </FormField>
                    <FormField
                      id={`receipt-quantity-${index}`}
                      label={`Received Quantity (${item?.packType ?? 'packages'})`}
                    >
                      <Input
                        id={`receipt-quantity-${index}`}
                        type="number"
                        min="0"
                        step={item?.wholePackagesOnly || po ? 1 : 'any'}
                        max={orderLine ? orderLine.remainingQuantity / orderLine.packQuantity : undefined}
                        required
                        value={line.packages}
                        onChange={(e) => update(index, { packages: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField
                      id={`receipt-cost-${index}`}
                      label={`Purchase Price / ${item?.packType ?? 'package'} (₹)`}
                    >
                      <Input
                        id={`receipt-cost-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        readOnly={!!po}
                        value={line.unitCost}
                        onChange={(e) => update(index, { unitCost: Number(e.target.value) })}
                      />
                    </FormField>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField
                      id={`receipt-transit-${index}`}
                      label={`Transit ID${po && line.packages > 0 ? ' *' : ''}`}
                    >
                      <Input
                        id={`receipt-transit-${index}`}
                        maxLength={100}
                        required={!!po && line.packages > 0}
                        value={line.transitId}
                        onChange={(e) => update(index, { transitId: e.target.value })}
                      />
                    </FormField>
                    <FormField id={`receipt-received-${index}`} label="Received Date *">
                      <Input
                        id={`receipt-received-${index}`}
                        type="date"
                        required
                        value={line.receivedDate}
                        onChange={(e) => update(index, { receivedDate: e.target.value })}
                      />
                    </FormField>
                    <FormField id={`receipt-mrp-${index}`} label={`MRP / ${item?.packType ?? 'package'} (₹)`}>
                      <Input
                        id={`receipt-mrp-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={line.mrpPrice}
                        onChange={(e) => update(index, { mrpPrice: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField id={`receipt-batch-${index}`} label="Batch Number">
                      <Input
                        id={`receipt-batch-${index}`}
                        maxLength={100}
                        value={line.batchNumber}
                        onChange={(e) => update(index, { batchNumber: e.target.value })}
                      />
                    </FormField>
                    <FormField id={`receipt-manufacture-${index}`} label="Manufactured Date">
                      <Input
                        id={`receipt-manufacture-${index}`}
                        type="date"
                        value={line.manufacturedDate}
                        max={line.expiryDate || undefined}
                        onChange={(e) => update(index, { manufacturedDate: e.target.value })}
                      />
                    </FormField>
                    <FormField id={`receipt-expiry-${index}`} label="Expiry Date">
                      <Input
                        id={`receipt-expiry-${index}`}
                        type="date"
                        value={line.expiryDate}
                        min={line.manufacturedDate || undefined}
                        onChange={(e) => update(index, { expiryDate: e.target.value })}
                      />
                    </FormField>
                  </div>
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-dashed border-[#005390]/40 text-[#005390] hover:bg-[#005390]/5 font-semibold transition cursor-pointer flex items-center justify-center gap-2 py-2.5"
              disabled={!supplierId || lines.length >= 100}
              onClick={() => setLines((current) => [...current, newLine()])}
            >
              <Plus className="w-4 h-4" />
              Add Item / Batch
            </Button>
            <FormField id="receipt-notes" label="Notes">
              <Textarea id="receipt-notes" maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          </FieldGroup>
          {(error || items.error || suppliers.error) && <ErrorNotice error={error || items.error || suppliers.error} />}
          <DialogFooter className="border-t border-gray-100 pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-gray-200 cursor-pointer"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#005390] hover:bg-[#004170] text-white font-bold rounded-xl shadow-md cursor-pointer"
              disabled={mutation.isPending || items.isPending || suppliers.isPending}
            >
              {mutation.isPending ? 'Receiving…' : 'Stock In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
