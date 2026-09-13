import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList, Plus, Trash2 } from 'lucide-react'
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
import type { PurchaseOrder, PurchaseOrderInput } from '@/lib/types/centerInventory'
import { ErrorNotice, FormField } from './shared'
import { baseQuantity, money } from './utils'
export function PurchaseOrderForm({
  locationId,
  categoryId,
  record,
  onClose,
  onSaved,
}: {
  locationId: string
  categoryId?: string
  record?: PurchaseOrder
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const suppliers = useCenterOptions(locationId, 'suppliers')
  const items = useCenterOptions(locationId, 'items', record || !categoryId ? {} : { categoryId })
  const mutation = useCenterMutation<PurchaseOrder>(locationId)
  const [requestId] = useState(() => crypto.randomUUID())
  const [supplierId, setSupplierId] = useState(record?.supplierId ?? '')
  const [notes, setNotes] = useState(record?.notes ?? '')
  const [error, setError] = useState<unknown>(null)
  const [lines, setLines] = useState(
    () =>
      record?.items.map((l) => ({
        key: crypto.randomUUID(),
        itemId: l.itemId,
        packages: l.orderedQuantity / l.packQuantity,
        price: Number(l.agreedPrice),
      })) ?? [{ key: crypto.randomUUID(), itemId: '', packages: 1, price: 0 }],
  )
  const update = (index: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  const eligible = (items.data ?? []).filter(
    (i) => i.isActive && i.suppliers.some((s) => s.id === supplierId && s.isActive),
  )
  const total = lines.reduce((sum, line) => sum + line.packages * line.price, 0)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl rounded-3xl p-6 shadow-2xl border border-gray-100">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">{record ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">Select a vendor and the items to order.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form
          className="flex flex-col gap-5"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            try {
              if (new Set(lines.map((l) => l.itemId)).size !== lines.length)
                throw new Error('Each item may appear only once')
              const input: PurchaseOrderInput = {
                requestId,
                supplierId,
                notes: notes || null,
                items: lines.map((l) => {
                  const item = eligible.find((i) => i.id === l.itemId)
                  if (!item) throw new Error('Select an item supplied by this vendor')
                  const agreedPrice = l.price
                  if (!Number.isInteger(l.packages)) throw new Error('Purchase orders must contain whole packages')
                  return {
                    itemId: l.itemId,
                    orderedQuantity: baseQuantity(l.packages, item.packQuantity),
                    agreedPrice: Math.round(agreedPrice * 100) / 100,
                  }
                }),
              }
              const saved = await mutation.mutateAsync({
                path: record ? `purchase-orders/${record.id}` : 'purchase-orders',
                method: record ? 'put' : 'post',
                data: input,
              })
              toast.success(record ? 'Purchase order updated' : 'Purchase order created')
              onSaved(saved.id)
            } catch (err) {
              setError(err)
            }
          }}
        >
          <FieldGroup>
            <FormField id="po-supplier" label="Vendor *">
              <NativeSelect
                id="po-supplier"
                value={supplierId}
                required
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  setLines([{ key: crypto.randomUUID(), itemId: '', packages: 1, price: 0 }])
                }}
              >
                <NativeSelectOption value="">Select vendor</NativeSelectOption>
                {suppliers.data
                  ?.filter((s) => s.isActive)
                  .map((s) => (
                    <NativeSelectOption key={s.id} value={s.id}>
                      {s.name}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </FormField>
            {lines.map((line, index) => {
              const item = eligible.find((i) => i.id === line.itemId)
              return (
                <div key={line.key} className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Item #{index + 1}
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
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField id={`po-item-${index}`} label="Item *">
                      <NativeSelect
                        id={`po-item-${index}`}
                        value={line.itemId}
                        required
                        onChange={(e) => update(index, { itemId: e.target.value })}
                      >
                        <NativeSelectOption value="">Select item</NativeSelectOption>
                        {eligible
                          .filter((i) => i.id === line.itemId || !lines.some((l) => l.itemId === i.id))
                          .map((i) => (
                            <NativeSelectOption key={i.id} value={i.id}>
                              {i.name}
                            </NativeSelectOption>
                          ))}
                      </NativeSelect>
                    </FormField>
                    <FormField id={`po-quantity-${index}`} label={`Quantity (${item?.packType ?? 'packages'}) *`}>
                      <Input
                        id={`po-quantity-${index}`}
                        type="number"
                        min={1}
                        step={1}
                        value={line.packages}
                        required
                        onChange={(e) => update(index, { packages: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField id={`po-price-${index}`} label={`Agreed Price / ${item?.packType ?? 'package'} (₹) *`}>
                      <Input
                        id={`po-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.price}
                        required
                        onChange={(e) => update(index, { price: Number(e.target.value) })}
                      />
                    </FormField>
                  </div>
                  {item && (
                    <div className="rounded-xl bg-blue-50/70 border border-blue-100 px-3 py-1.5 text-xs text-blue-700 font-medium">
                      {item.packQuantity} {item.packUnit} per {item.packType} · Stock: <span className="font-bold">{item.stockDisplay}</span>
                    </div>
                  )}
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-dashed border-[#005390]/40 text-[#005390] hover:bg-[#005390]/5 font-semibold transition cursor-pointer flex items-center justify-center gap-2 py-2.5"
              disabled={!supplierId || lines.length >= 100}
              onClick={() =>
                setLines((current) => [...current, { key: crypto.randomUUID(), itemId: '', packages: 1, price: 0 }])
              }
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
            <FormField id="po-notes" label="Notes">
              <Textarea id="po-notes" maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          </FieldGroup>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Purchase Order Amount</p>
              <p className="text-xs text-emerald-600 mt-0.5">Calculated across all item lines</p>
            </div>
            <p className="text-2xl font-black text-emerald-700">{money(total)}</p>
          </div>
          {(error || suppliers.error || items.error) && <ErrorNotice error={error || suppliers.error || items.error} />}
          <DialogFooter className="border-t border-gray-100 pt-4 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl border-gray-200 cursor-pointer" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#005390] hover:bg-[#004170] text-white font-bold rounded-xl shadow-md cursor-pointer" disabled={mutation.isPending || items.isPending || suppliers.isPending}>
              {mutation.isPending ? 'Saving…' : record ? 'Save Changes' : 'Create Purchase Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
