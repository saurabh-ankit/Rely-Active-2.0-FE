import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowUpRight, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useCenterOptions, useCenterMutation } from '@/hooks/react-query/centerInventory'
import { useDebounce } from '@/hooks/useDebounce'
import { getCenterData, mutateCenter } from '@/lib/services/centerInventoryService'
import type {
  AssignmentInput,
  AssignmentPreview,
  AssignmentRecipient,
  CenterItem,
  StockTransaction,
} from '@/lib/types/centerInventory'
import type { InventoryList } from '@/lib/types/inventory'
import { ErrorNotice, FormField } from './shared'
import { money, quantityDisplay, today } from './utils'

function Picker<T extends { id: string; name: string }>({
  id,
  items,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string
  items: T[]
  value: T | null
  onChange: (value: T | null) => void
  placeholder: string
  disabled?: boolean
}) {
  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={onChange}
      itemToStringLabel={(item) => item.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
    >
      <ComboboxInput id={id} placeholder={placeholder} showClear />
      <ComboboxContent>
        <ComboboxEmpty>No matches found.</ComboboxEmpty>
        <ComboboxList>
          {(item: T) => (
            <ComboboxItem key={item.id} value={item}>
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function AssignItemsForm({
  locationId,
  categoryId,
  onClose,
  onSaved,
}: {
  locationId: string
  categoryId?: string
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [recipientType, setRecipientType] = useState<'resident' | 'staff'>('resident')
  const [recipient, setRecipient] = useState<AssignmentRecipient | null>(null)
  const [category, setCategory] = useState(categoryId ?? '')
  const [lines, setLines] = useState<{ item: CenterItem; quantity: number }[]>([])
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const categories = useCenterOptions(locationId, 'categories')
  const items = useCenterOptions(locationId, 'items', category ? { categoryId: category } : {})
  const mutation = useCenterMutation<StockTransaction>(locationId)
  const recipients = useQuery({
    queryKey: ['center-inventory', locationId, 'assignment-recipients', recipientType],
    queryFn: async () => {
      const path = `assignment-recipients?type=${recipientType}`
      const first = await getCenterData<InventoryList<AssignmentRecipient>>(locationId, path, { page: 1, limit: 100 })
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, i) =>
          getCenterData<InventoryList<AssignmentRecipient>>(locationId, path, { page: i + 2, limit: 100 }),
        ),
      )
      return [...first.records, ...rest.flatMap((p) => p.records)]
    },
  })
  const payload: AssignmentInput = useMemo(
    () => ({
      requestId,
      date,
      notes: notes.trim() || null,
      ...(recipient
        ? recipientType === 'resident'
          ? { residentId: recipient.id }
          : { assignedUserId: recipient.id }
        : {}),
      items: lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
    }),
    [requestId, date, notes, recipient, recipientType, lines],
  )
  const valid =
    !!recipient &&
    !!date &&
    lines.length > 0 &&
    lines.every(
      (l) =>
        Number.isSafeInteger(l.quantity) &&
        l.quantity > 0 &&
        l.quantity <= l.item.quantity &&
        (!l.item.wholePackagesOnly || l.quantity % l.item.packQuantity === 0),
    )
  const debounced = useDebounce(payload, 300)
  const preview = useQuery({
    queryKey: ['center-inventory', locationId, 'assignment-preview', debounced],
    queryFn: () => mutateCenter<AssignmentPreview>(locationId, 'assign-items/preview', 'post', debounced),
    enabled: valid && debounced === payload && !mutation.isPending,
    retry: false,
  })
  const currentPreview = debounced === payload ? preview.data : undefined
  const edit = () => {
    setRequestId(crypto.randomUUID())
    mutation.reset()
  }
  const busy = mutation.isPending
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl rounded-3xl p-6 shadow-2xl border border-gray-100">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">Assign Items</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                Assign center stock to a resident or staff member. MRP amounts use the oldest received stock first (FIFO).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!valid || !currentPreview || busy) return
            mutation.mutate(
              { path: 'assign-items', data: payload },
              {
                onSuccess: (record) => {
                  toast.success(
                    `Items assigned · ${record.mrpAmount == null ? 'Amount unavailable' : money(record.mrpAmount)}`,
                  )
                  onSaved(record.id)
                },
              },
            )
          }}
          className="flex flex-col gap-5 pt-2"
        >
          <fieldset disabled={busy} className="min-w-0">
            <FieldGroup>
              <div className="space-y-1.5">
                <span className="block text-xs font-semibold text-gray-700">Assign to</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      edit()
                      setRecipientType('resident')
                      setRecipient(null)
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      recipientType === 'resident'
                        ? 'bg-[#005390] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Resident
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      edit()
                      setRecipientType('staff')
                      setRecipient(null)
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      recipientType === 'staff'
                        ? 'bg-[#005390] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Staff
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="assignment-recipient" label={recipientType === 'resident' ? 'Resident *' : 'Staff user *'}>
                  <Picker
                    id="assignment-recipient"
                    items={recipients.data ?? []}
                    value={recipient}
                    onChange={(value) => {
                      edit()
                      setRecipient(value)
                    }}
                    placeholder={recipients.isPending ? 'Loading recipients…' : 'Search recipients…'}
                    disabled={busy || recipients.isPending}
                  />
                </FormField>
                <FormField id="assignment-date" label="Assignment date *">
                  <Input
                    id="assignment-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => {
                      edit()
                      setDate(e.target.value)
                    }}
                    className="rounded-xl border-gray-200 text-xs h-10"
                  />
                </FormField>
              </div>
              {recipients.isError && <ErrorNotice error={recipients.error} retry={() => void recipients.refetch()} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="assignment-category" label="Category">
                  <Picker
                    id="assignment-category"
                    items={categories.data ?? []}
                    value={categories.data?.find((c) => c.id === category) ?? null}
                    onChange={(value) => setCategory(value?.id ?? '')}
                    placeholder="Search categories…"
                    disabled={busy}
                  />
                </FormField>
                <FormField id="assignment-item" label="Add item">
                  <Picker
                    id="assignment-item"
                    items={items.data?.filter((i) => i.isActive && i.quantity > 0 && !lines.some((l) => l.item.id === i.id)) ?? []}
                    value={null}
                    onChange={(item) => {
                      if (item) {
                        edit()
                        setLines((previous) => [
                          ...previous,
                          { item, quantity: item.wholePackagesOnly ? item.packQuantity : 1 },
                        ])
                      }
                    }}
                    placeholder={items.isPending ? 'Loading items…' : 'Search available items…'}
                    disabled={busy || lines.length >= 100}
                  />
                </FormField>
              </div>
              {categories.isError && <ErrorNotice error={categories.error} retry={() => void categories.refetch()} />}
              {items.isError && <ErrorNotice error={items.error} retry={() => void items.refetch()} />}
            </FieldGroup>
            {lines.length > 0 && (
              <div className="mt-4 rounded-2xl border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/70">
                      <TableHead>Item / Available</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>MRP Amount</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const whole = line.item.wholePackagesOnly
                      const step = whole ? line.item.packQuantity : 1
                      const invalid =
                        !Number.isSafeInteger(line.quantity) ||
                        line.quantity < step ||
                        line.quantity > line.item.quantity ||
                        line.quantity % step !== 0
                      const estimate = currentPreview?.items.find((i) => i.itemId === line.item.id)
                      return (
                        <TableRow key={line.item.id}>
                          <TableCell>
                            <p className="font-semibold text-gray-900">{line.item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {quantityDisplay(estimate?.availableQuantity ?? line.item.quantity, line.item)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <FormField
                              id={`assign-qty-${line.item.id}`}
                              label={whole ? line.item.packType : line.item.packUnit}
                            >
                              <Input
                                id={`assign-qty-${line.item.id}`}
                                type="number"
                                min={1}
                                step={1}
                                max={Math.floor(line.item.quantity / step)}
                                aria-invalid={invalid}
                                value={line.quantity / step || ''}
                                onChange={(e) => {
                                  edit()
                                  setLines((previous) =>
                                    previous.map((l) =>
                                      l.item.id === line.item.id ? { ...l, quantity: Number(e.target.value) * step } : l,
                                    ),
                                  )
                                }}
                                className="rounded-xl border-gray-200 text-xs w-28 h-9"
                              />
                              {invalid && (
                                <p className="text-destructive text-xs mt-1">Enter a valid quantity.</p>
                              )}
                            </FormField>
                          </TableCell>
                          <TableCell className="font-medium">
                            {invalid
                              ? '—'
                              : quantityDisplay(
                                  estimate?.remainingQuantity ?? line.item.quantity - line.quantity,
                                  line.item,
                                )}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">{estimate ? money(estimate.mrpAmount) : '—'}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              aria-label={`Remove ${line.item.name}`}
                              onClick={() => {
                                edit()
                                setLines((previous) => previous.filter((l) => l.item.id !== line.item.id))
                              }}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4">
              <FormField id="assignment-notes" label="Notes (Optional)">
                <Textarea
                  id="assignment-notes"
                  maxLength={5000}
                  value={notes}
                  onChange={(e) => {
                    edit()
                    setNotes(e.target.value)
                  }}
                  rows={2}
                  placeholder="Add any instructions or remarks..."
                  className="rounded-xl border-gray-200 text-xs"
                />
              </FormField>
            </div>
          </fieldset>
          {preview.isError && debounced === payload && (
            <ErrorNotice error={preview.error} retry={() => void preview.refetch()} />
          )}
          {mutation.isError && <ErrorNotice error={mutation.error} />}
          <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-700">Estimated MRP Amount</span>
              <p className="text-[11px] text-gray-500 mt-0.5">Calculated using oldest received stock batches (FIFO)</p>
            </div>
            <div className="text-xl font-bold text-[#005390]">
              {currentPreview ? money(currentPreview.mrpAmount) : valid ? 'Calculating…' : '—'}
            </div>
          </div>
          <DialogFooter className="pt-2 border-t border-gray-100 gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl border-gray-200 cursor-pointer" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#005390] hover:bg-[#004170] text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              disabled={!valid || !currentPreview || preview.isFetching || busy}
            >
              {busy ? 'Assigning…' : 'Assign Items'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
