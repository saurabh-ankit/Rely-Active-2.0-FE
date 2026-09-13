import { useState } from 'react'
import { toast } from 'sonner'
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
  categoryId: string
  record?: PurchaseOrder
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const suppliers = useCenterOptions(locationId, 'suppliers')
  const items = useCenterOptions(locationId, 'items', record ? {} : { categoryId })
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
          <DialogDescription>Select a supplier and the items to order.</DialogDescription>
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
                  if (!item) throw new Error('Select an item supplied by this supplier')
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
            <FormField id="po-supplier" label="Supplier *">
              <NativeSelect
                id="po-supplier"
                value={supplierId}
                required
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  setLines([{ key: crypto.randomUUID(), itemId: '', packages: 1, price: 0 }])
                }}
              >
                <NativeSelectOption value="">Select supplier</NativeSelectOption>
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
                <FieldGroup key={line.key} className="rounded-lg border p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {item
                        ? `${item.packQuantity} ${item.packUnit} per ${item.packType} · Stock: ${item.stockDisplay}`
                        : 'Select a supplier to see available items'}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={lines.length === 1}
                      onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                    >
                      Remove item
                    </Button>
                  </div>
                </FieldGroup>
              )
            })}
            <Button
              type="button"
              variant="outline"
              disabled={!supplierId || lines.length >= 100}
              onClick={() =>
                setLines((current) => [...current, { key: crypto.randomUUID(), itemId: '', packages: 1, price: 0 }])
              }
            >
              Add Item
            </Button>
            <FormField id="po-notes" label="Notes">
              <Textarea id="po-notes" maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          </FieldGroup>
          <p className="text-right font-semibold">Total Amount: {money(total)}</p>
          {(error || suppliers.error || items.error) && <ErrorNotice error={error || suppliers.error || items.error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || items.isPending || suppliers.isPending}>
              {mutation.isPending ? 'Saving…' : record ? 'Save Changes' : 'Create Purchase Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
