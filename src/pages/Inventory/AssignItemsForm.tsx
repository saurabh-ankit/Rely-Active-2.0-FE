import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
  categoryId: string
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [recipientType, setRecipientType] = useState<'resident' | 'staff'>('resident')
  const [recipient, setRecipient] = useState<AssignmentRecipient | null>(null)
  const [category, setCategory] = useState(categoryId)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Assign Items</DialogTitle>
          <DialogDescription>
            Assign center stock to a resident or staff member. MRP amounts use the oldest received stock first.
          </DialogDescription>
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
          className="flex flex-col gap-5"
        >
          <fieldset disabled={busy} className="min-w-0">
            <FieldGroup>
              <FormField id="assignment-recipient-type" label="Assign to">
                <ToggleGroup
                  id="assignment-recipient-type"
                  value={[recipientType]}
                  variant="outline"
                  onValueChange={(value) => {
                    if (value[0] === 'resident' || value[0] === 'staff') {
                      edit()
                      setRecipientType(value[0])
                      setRecipient(null)
                    }
                  }}
                >
                  <ToggleGroupItem value="resident">Resident</ToggleGroupItem>
                  <ToggleGroupItem value="staff">Staff</ToggleGroupItem>
                </ToggleGroup>
              </FormField>
              <FormField id="assignment-recipient" label={recipientType === 'resident' ? 'Resident' : 'Staff user'}>
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
              {recipients.isError && <ErrorNotice error={recipients.error} retry={() => void recipients.refetch()} />}
              <FormField id="assignment-date" label="Assignment date">
                <Input
                  id="assignment-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    edit()
                    setDate(e.target.value)
                  }}
                />
              </FormField>
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
                  items={(items.data ?? []).filter(
                    (i) => i.isActive && i.quantity > 0 && !lines.some((l) => l.item.id === i.id),
                  )}
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
              {categories.isError && <ErrorNotice error={categories.error} retry={() => void categories.refetch()} />}
              {items.isError && <ErrorNotice error={items.error} retry={() => void items.refetch()} />}
            </FieldGroup>
            {lines.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
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
                          <p>{line.item.name}</p>
                          <p className="text-muted-foreground">
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
                            />
                            {invalid && (
                              <p className="text-destructive text-sm">Enter a whole quantity within available stock.</p>
                            )}
                          </FormField>
                        </TableCell>
                        <TableCell>
                          {invalid
                            ? '—'
                            : quantityDisplay(
                                estimate?.remainingQuantity ?? line.item.quantity - line.quantity,
                                line.item,
                              )}
                        </TableCell>
                        <TableCell>{estimate ? money(estimate.mrpAmount) : '—'}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
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
            )}
            <FormField id="assignment-notes" label="Notes">
              <Textarea
                id="assignment-notes"
                maxLength={5000}
                value={notes}
                onChange={(e) => {
                  edit()
                  setNotes(e.target.value)
                }}
              />
            </FormField>
          </fieldset>
          {preview.isError && debounced === payload && (
            <ErrorNotice error={preview.error} retry={() => void preview.refetch()} />
          )}
          {mutation.isError && <ErrorNotice error={mutation.error} />}
          <p aria-live="polite">
            Estimated MRP amount:{' '}
            <strong>{currentPreview ? money(currentPreview.mrpAmount) : valid ? 'Calculating…' : '—'}</strong>
          </p>
          <p className="text-sm text-muted-foreground">The final amount is calculated when you assign the items.</p>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || !currentPreview || preview.isFetching || busy}>
              {busy ? 'Assigning…' : 'Assign Items'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
