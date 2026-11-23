import { useMemo, useRef, useState } from 'react'
import { Copy, Download, Edit, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/ui/data-table'
import {
  useCreateItemRequest,
  useDeleteItemRequest,
  useGetAssets,
  useGetItemRequests,
  useUpdateItemRequest,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import type { Asset, AssetItemRequest, ItemRequestAssetRef, ItemRequestReason } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'

const getAssetOptionLabel = (asset: Pick<Asset, 'serialNumber' | 'assetTag'> & { item?: { name?: string } | null }) =>
  [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' - ') ||
  '—'

const getEnrichedAssetLabel = (asset: ItemRequestAssetRef) =>
  [asset.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' - ') || '—'

const REASON_OPTIONS: { value: ItemRequestReason; label: string }[] = [
  { value: 'scrap', label: 'Scrap' },
  { value: 'repair', label: 'Repair' },
  { value: 'external_use', label: 'External use' },
]

const reasonLabel = (reason: ItemRequestReason) =>
  REASON_OPTIONS.find((opt) => opt.value === reason)?.label || reason

const statusBadgeClass = (status: string) => {
  if (status === 'approved') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'declined') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}

interface AssetItemRequestsProps {
  enabled?: boolean
}

const AssetItemRequests = ({ enabled = true }: AssetItemRequestsProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<AssetItemRequest | null>(null)
  const [qrPreview, setQrPreview] = useState<AssetItemRequest | null>(null)
  const [declineImagePreview, setDeclineImagePreview] = useState<AssetItemRequest | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    assetIds: [] as string[],
    reason: '' as ItemRequestReason | '',
    problem: '',
    requestImage: '' as string,
  })
  const [assetSearch, setAssetSearch] = useState('')
  const [imageCleared, setImageCleared] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchTerm, 500)

  const { data: requestsData, isLoading, refetch: refetchItemRequests } = useGetItemRequests({
    search: debouncedSearch || undefined,
    limit: 1000,
    enabled,
  })

  const { data: assetsData } = useGetAssets({
    limit: 1000,
    enabled: isModalOpen,
  })

  const createMutation = useCreateItemRequest()
  const updateMutation = useUpdateItemRequest()
  const deleteMutation = useDeleteItemRequest()

  const itemRequests = requestsData?.data?.itemRequests || []
  const assetOptions: Asset[] = assetsData?.data?.assets || []
  const selectedAssets = assetOptions.filter((asset) => formData.assetIds.includes(asset.id))
  const filteredAssetOptions = useMemo(() => {
    const q = assetSearch.trim().toLowerCase()
    if (!q) return assetOptions
    return assetOptions.filter((asset) => {
      const label = getAssetOptionLabel(asset).toLowerCase()
      return (
        label.includes(q) ||
        (asset.item?.name || '').toLowerCase().includes(q) ||
        (asset.serialNumber || '').toLowerCase().includes(q) ||
        (asset.assetTag || '').toLowerCase().includes(q)
      )
    })
  }, [assetOptions, assetSearch])

  const isSaving = createMutation.isPending || updateMutation.isPending

  const toggleAsset = (assetId: string) => {
    setFormData((prev) => ({
      ...prev,
      assetIds: prev.assetIds.includes(assetId)
        ? prev.assetIds.filter((id) => id !== assetId)
        : [...prev.assetIds, assetId],
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      assetIds: [],
      reason: '',
      problem: '',
      requestImage: '',
    })
    setAssetSearch('')
    setImageCleared(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenModal = (request?: AssetItemRequest) => {
    if (request) {
      setEditingRequest(request)
      setFormData({
        name: request.name,
        phone: request.phone,
        assetIds: Array.isArray(request.assetIds) ? request.assetIds.map(String) : [],
        reason: request.reason,
        problem: request.problem || '',
        requestImage: '',
      })
      setImageCleared(false)
      setAssetSearch('')
    } else {
      setEditingRequest(null)
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingRequest(null)
    resetForm()
  }

  const handleRequestImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, requestImage: reader.result as string }))
      setImageCleared(false)
    }
    reader.readAsDataURL(file)
  }

  const clearRequestImage = () => {
    setFormData((prev) => ({ ...prev, requestImage: '' }))
    setImageCleared(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const previewRequestImage =
    formData.requestImage ||
    (!imageCleared && editingRequest?.requestImage ? editingRequest.requestImage : '')

  const handleNameChange = (value: string) => {
    // Alphabets and spaces only
    const sanitized = value.replace(/[^a-zA-Z\s]/g, '')
    setFormData((prev) => ({ ...prev, name: sanitized }))
  }

  const handlePhoneChange = (value: string) => {
    // Digits only, max 10
    const sanitized = value.replace(/\D/g, '').slice(0, 10)
    setFormData((prev) => ({ ...prev, phone: sanitized }))
  }

  const handleSubmit = async () => {
    const name = formData.name.trim()
    const phone = formData.phone.trim()

    if (!name) {
      toast.error('Name is required')
      return
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      toast.error('Name can only contain alphabets')
      return
    }
    if (!phone) {
      toast.error('Phone is required')
      return
    }
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Phone must be exactly 10 digits')
      return
    }
    if (formData.assetIds.length === 0) {
      toast.error('Select at least one asset')
      return
    }
    if (!formData.reason) {
      toast.error('Reason is required')
      return
    }

    const payload: {
      name: string
      phone: string
      assetIds: string[]
      reason: ItemRequestReason
      problem?: string
      requestImage?: string | null
    } = {
      name,
      phone,
      assetIds: formData.assetIds,
      reason: formData.reason,
      problem: formData.problem.trim() || undefined,
    }

    if (formData.requestImage) {
      payload.requestImage = formData.requestImage
    } else if (editingRequest && imageCleared) {
      payload.requestImage = null
    }

    try {
      if (editingRequest) {
        await updateMutation.mutateAsync({
          id: editingRequest.id,
          data: payload,
        })
        handleCloseModal()
        await refetchItemRequests()
      } else {
        const result = await createMutation.mutateAsync(payload)
        handleCloseModal()
        await refetchItemRequests()
        if (result?.data) {
          setQrPreview(result.data)
        }
      }
    } catch {
      // toast handled in mutation
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this item request?')) return
    await deleteMutation.mutateAsync(id)
  }

  const handleCopyQrCode = async () => {
    const code = qrPreview?.qrCode?.trim()
    if (!code) {
      toast.error('QR code is not available')
      return
    }
    try {
      await navigator.clipboard.writeText(code)
      toast.success('QR code copied')
    } catch {
      toast.error('Failed to copy QR code')
    }
  }

  const handleDownloadQr = async () => {
    const imageSrc = qrPreview?.qrCodeImage
    const code = qrPreview?.qrCode?.trim() || 'gate-pass-qr'
    if (!imageSrc) {
      toast.error('QR image is not available')
      return
    }

    try {
      let blob: Blob
      if (imageSrc.startsWith('data:')) {
        const response = await fetch(imageSrc)
        blob = await response.blob()
      } else {
        const response = await fetch(imageSrc)
        if (!response.ok) throw new Error('Failed to fetch QR image')
        blob = await response.blob()
      }

      const extension = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gate-pass-qr-${code}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('QR downloaded')
    } catch {
      toast.error('Failed to download QR')
    }
  }

  const columns: ColumnDef<AssetItemRequest>[] = [
    {
      accessorKey: 'name',
      header: 'NAME',
      cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'PHONE',
      cell: ({ row }) => <span className="text-gray-700">{row.original.phone}</span>,
    },
    {
      id: 'assets',
      header: 'ASSETS',
      cell: ({ row }) => {
        const labels =
          row.original.assets?.map((asset) => getEnrichedAssetLabel(asset)).filter(Boolean) || []
        return <span className="text-gray-700">{labels.length ? labels.join(', ') : '—'}</span>
      },
    },
    {
      accessorKey: 'reason',
      header: 'REASON',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {reasonLabel(row.original.reason)}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'GENERATED ON',
      cell: ({ row }) => (
        <span className="text-gray-700">
          {row.original.createdAt ? formatDisplayDate(row.original.createdAt) : '—'}
        </span>
      ),
    },
    {
      id: 'expectedReturnDate',
      header: 'EXPECTED RETURN',
      cell: ({ row }) => (
        <span className="text-gray-700">
          {row.original.expectedReturnDate
            ? formatDisplayDate(row.original.expectedReturnDate)
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'problem',
      header: 'DESCRIPTION',
      cell: ({ row }) => (
        <span className="text-gray-700 line-clamp-2 max-w-[220px]">{row.original.problem || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: ({ row }) => {
        const { status, decidedByName } = row.original
        const showDecidedBy =
          (status === 'approved' || status === 'declined') && !!decidedByName
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant="outline" className={`w-fit capitalize ${statusBadgeClass(status)}`}>
              {status}
            </Badge>
            {showDecidedBy ? (
              <span className="text-[11px] text-gray-500 leading-tight">by {decidedByName}</span>
            ) : null}
          </div>
        )
      },
    },
    {
      id: 'declineComment',
      header: 'DECLINE COMMENT',
      cell: ({ row }) => {
        const { declineComment, decidedByName, status } = row.original
        return (
          <div className="flex flex-col gap-0.5 max-w-[220px]">
            <span className="text-gray-700 line-clamp-2">{declineComment || '—'}</span>
            {status === 'declined' && decidedByName ? (
              <span className="text-[11px] text-gray-500 leading-tight">By {decidedByName}</span>
            ) : null}
          </div>
        )
      },
    },
    {
      id: 'declineImage',
      header: 'DECLINE IMAGE',
      cell: ({ row }) => {
        const request = row.original
        if (!request.declineImage) {
          return <span className="text-gray-500">—</span>
        }
        return (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              className="inline-flex cursor-pointer group w-fit"
              onClick={() => setDeclineImagePreview(request)}
              title="View decline image"
            >
              <img
                src={request.declineImage}
                alt="Decline evidence"
                className="w-12 h-12 object-cover rounded border border-gray-200 group-hover:opacity-80 transition-opacity bg-white"
              />
            </button>
            {request.status === 'declined' && request.decidedByName ? (
              <span className="text-[11px] text-gray-500 leading-tight">
                By {request.decidedByName}
              </span>
            ) : null}
          </div>
        )
      },
    },
    {
      id: 'qr',
      header: 'QR',
      cell: ({ row }) => {
        const request = row.original
        if (!request.qrCodeImage) {
          return <span className="text-xs font-mono text-gray-500">{request.qrCode || '—'}</span>
        }
        return (
          <button
            type="button"
            className="inline-flex flex-col items-center gap-1 cursor-pointer group"
            onClick={() => setQrPreview(request)}
            title="View QR code"
          >
            <img
              src={request.qrCodeImage}
              alt="QR Code"
              className="w-12 h-12 object-contain rounded border border-gray-200 group-hover:opacity-80 transition-opacity bg-white"
            />
            <span className="text-[10px] font-mono font-bold text-gray-500">{request.qrCode}</span>
          </button>
        )
      },
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <PermissionGuard permission="assets:update">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenModal(row.original)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title="Edit item request"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="assets:delete">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row.original.id)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title="Delete item request"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={itemRequests}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search item requests..."
          />
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => (open ? setIsModalOpen(true) : handleCloseModal())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRequest ? 'Edit Gate Pass' : 'Create Gate Pass'}</DialogTitle>
            <DialogDescription>
              {editingRequest
                ? 'Update the item request details. The QR code remains unchanged.'
                : 'Create a request and generate a QR code with full details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-1">
            <div>
              <Label htmlFor="item-request-name" className="mb-2">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="item-request-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Requester name"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="item-request-phone" className="mb-2">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="item-request-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="10-digit phone number"
              />
            </div>

            <div>
              <Label className="mb-2">
                Asset <span className="text-red-500">*</span>
              </Label>
              {selectedAssets.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {selectedAssets.map((asset) => {
                    const label = getAssetOptionLabel(asset)
                    return (
                      <Badge key={asset.id} variant="secondary" className="gap-1 pr-1">
                        {label}
                        <button
                          type="button"
                          className="rounded-sm p-0.5 hover:bg-black/10"
                          onClick={() => toggleAsset(asset.id)}
                          aria-label={`Remove ${label}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
              <div className="rounded-md border border-input overflow-hidden">
                <div className="border-b border-input p-2">
                  <Input
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Search assets..."
                    className="h-8"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                  {filteredAssetOptions.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-muted-foreground">No assets found</p>
                  ) : (
                    filteredAssetOptions.map((asset) => {
                      const checked = formData.assetIds.includes(asset.id)
                      const label = getAssetOptionLabel(asset)
                      return (
                        <label
                          key={asset.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleAsset(asset.id)} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.reason}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, reason: value as ItemRequestReason }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="item-request-problem" className="mb-2">
                Description
              </Label>
              <Textarea
                id="item-request-problem"
                value={formData.problem}
                onChange={(e) => setFormData((prev) => ({ ...prev, problem: e.target.value }))}
                placeholder="Add a short description"
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-2">Upload File</Label>
              <div className="flex items-start gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {previewRequestImage ? 'Change Image' : 'Upload Image'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleRequestImageChange}
                />
                {previewRequestImage ? (
                  <div className="relative">
                    <img
                      src={previewRequestImage}
                      alt="Request attachment"
                      className="h-16 w-16 rounded-md object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={clearRequestImage}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Optional image shown when the QR is scanned.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingRequest ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrPreview} onOpenChange={(open) => !open && setQrPreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item Request QR</DialogTitle>
            <DialogDescription>
              Scan this code to view the full item request details.
            </DialogDescription>
          </DialogHeader>
          {qrPreview && (
            <div className="flex flex-col items-center gap-3 py-2">
              {qrPreview.qrCodeImage ? (
                <img
                  src={qrPreview.qrCodeImage}
                  alt="Item request QR"
                  className="w-56 h-56 object-contain rounded border border-gray-200 bg-white"
                />
              ) : null}
              <p className="text-sm font-mono font-bold text-gray-700">{qrPreview.qrCode}</p>
              <div className="w-full rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm space-y-1">
                <p>
                  <span className="font-semibold text-gray-700">Name:</span> {qrPreview.name}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Phone:</span> {qrPreview.phone}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Assets:</span>{' '}
                  {qrPreview.assets?.map((asset) => getEnrichedAssetLabel(asset)).join(', ') || '—'}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Reason:</span> {reasonLabel(qrPreview.reason)}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Description:</span> {qrPreview.problem || '—'}
                </p>
                {qrPreview.requestImage ? (
                  <div className="pt-1">
                    <p className="font-semibold text-gray-700 mb-1.5">Attachment:</p>
                    <img
                      src={qrPreview.requestImage}
                      alt="Request attachment"
                      className="w-full max-h-48 object-contain rounded border border-gray-200 bg-white"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setQrPreview(null)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleCopyQrCode} disabled={!qrPreview?.qrCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button onClick={handleDownloadQr} disabled={!qrPreview?.qrCodeImage}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!declineImagePreview}
        onOpenChange={(open) => !open && setDeclineImagePreview(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Evidence</DialogTitle>
            <DialogDescription>
              Photo attached when this item request was declined at the gate.
            </DialogDescription>
          </DialogHeader>
          {declineImagePreview?.declineImage && (
            <div className="flex flex-col items-center gap-3 py-2">
              <img
                src={declineImagePreview.declineImage}
                alt="Decline evidence"
                className="max-h-80 w-full object-contain rounded border border-gray-200 bg-white"
              />
              {declineImagePreview.declineComment && (
                <p className="w-full rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                  <span className="font-semibold">Comment:</span> {declineImagePreview.declineComment}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineImagePreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AssetItemRequests
