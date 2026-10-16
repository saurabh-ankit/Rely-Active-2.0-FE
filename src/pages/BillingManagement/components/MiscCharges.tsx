import { useState } from 'react'
import { Loader2, Paperclip, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiErrorMessage, useCreateMiscItem, useDeleteMiscItem, useUnitMiscItems } from '@/hooks/react-query/billing'
import { useLocationContext } from '@/hooks/useLocation'
import { useResourceAccess } from '@/hooks/useResourceAccess'
import { RESOURCE } from '@/lib/permissions/resourceKeys'
import { uploadBillingAttachmentAPI } from '@/lib/services/billingService'
import type { UnitMiscItem } from '@/lib/types/billing'
import { formatDay, formatInr, toDayString } from './billingFormat'

interface MiscChargesProps {
  unitId: string
  residents: { id: string; name: string; isResiding: boolean }[]
}

/** Charges logged against the flat before billing; the next invoice picks them up. */
export function MiscCharges({ unitId, residents }: MiscChargesProps) {
  const { selectedLocationId } = useLocationContext()
  const access = useResourceAccess(RESOURCE.BILLING_INVOICES)
  const { data: items = [], isLoading } = useUnitMiscItems(unitId)
  const create = useCreateMiscItem(unitId)
  const remove = useDeleteMiscItem(unitId)
  const [deleting, setDeleting] = useState<UnitMiscItem | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    residentId: 'none',
    quantity: '1',
    price: '',
    serviceDate: toDayString(new Date()),
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const valid = form.name.trim() && Number(form.quantity) > 0 && Number(form.price) > 0 && form.serviceDate

  const submit = async () => {
    if (!valid) return
    let attachmentUrl: string | null = null
    if (file) {
      setUploading(true)
      try {
        attachmentUrl = await uploadBillingAttachmentAPI(selectedLocationId, file)
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not upload the bill'))
        setUploading(false)
        return
      }
      setUploading(false)
    }
    create.mutate(
      {
        unitId,
        residentId: form.residentId === 'none' ? null : form.residentId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        quantity: Number(form.quantity),
        price: Number(form.price),
        serviceDate: form.serviceDate,
        attachmentUrl,
      },
      {
        onSuccess: () => {
          setForm((f) => ({ ...f, name: '', description: '', quantity: '1', price: '' }))
          setFile(null)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      {access.canCreate && (
        <Card className="bg-white/60">
          <CardHeader>
            <CardTitle className="text-base">Add a charge</CardTitle>
            <p className="text-xs text-gray-500">
              Logged against the flat now and billed on the invoice that covers its date.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <Label className="mb-1 block text-xs text-gray-600">Item</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1 block text-xs text-gray-600">Resident</Label>
              <Select value={form.residentId} onValueChange={(v) => setForm({ ...form, residentId: String(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Whole flat</SelectItem>
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {!r.isResiding ? ' (moved out)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-gray-600">Date</Label>
              <Input
                type="date"
                value={form.serviceDate}
                onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-xs text-gray-600">Qty</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-gray-600">Price</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>
            <div className="sm:col-span-4">
              <Label className="mb-1 block text-xs text-gray-600">Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <label className="flex h-9 flex-1 cursor-pointer items-center gap-2 truncate rounded-md border border-dashed border-gray-300 px-3 text-xs text-gray-600 hover:bg-gray-50">
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="truncate">{file ? file.name : 'Attach bill'}</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <Button
                className="bg-[#2a517c] text-white hover:bg-[#476587]"
                disabled={!valid || create.isPending || uploading}
                onClick={submit}
              >
                {create.isPending || uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                Add {valid ? formatInr(Number(form.quantity) * Number(form.price)) : ''}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#2b4f7e]" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No miscellaneous charges logged for this flat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Resident</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDay(item.serviceDate)}</TableCell>
                    <TableCell>
                      <p className="text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {Number(item.quantity)} × {formatInr(item.price)}
                        {item.description ? ` · ${item.description}` : ''}
                      </p>
                    </TableCell>
                    <TableCell>{residents.find((r) => r.id === item.residentId)?.name ?? 'Whole flat'}</TableCell>
                    <TableCell className="text-right font-medium">{formatInr(item.total)}</TableCell>
                    <TableCell>
                      {item.billedOnInvoice ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          On {item.billedOnInvoice}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-amber-700">
                          Unbilled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {item.attachmentUrl && (
                          <a
                            href={item.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="View bill"
                            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                          >
                            <Paperclip className="h-4 w-4" />
                          </a>
                        )}
                        {!item.billedOnInvoice && access.canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove charge"
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove this charge?"
        description={`"${deleting?.name ?? ''}" will not be billed.`}
        confirmLabel="Remove"
        isPending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}
