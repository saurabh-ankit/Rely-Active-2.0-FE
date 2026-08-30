import React, { useState } from 'react'
import { Edit, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  useCreateAsset,
  useDeleteAsset,
  useGetAssetCategories,
  useGetAssetItemsDropdown,
  useGetAssets,
  useGetAssetVendorsDropdown,
  useUpdateAsset,
} from '@/hooks/react-query/assetManagement'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { Asset, AssetCondition, AssetStatus } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'
import { BulkUploadModal } from './BulkUploadModal'

interface AssetListProps {
  enabled?: boolean
}

const AssetList: React.FC<AssetListProps> = ({ enabled = true }) => {
  const { selectedLocationId } = useLocationStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    itemId: '',
    vendorId: '',
    serialNumber: '',
    assetTag: '',
    purchaseDate: '',
    purchasePrice: '',
    warrantyEndDate: '',
    warrantyDocument: null as File | null,
    warrantyDocumentName: '',
    warrantyDocumentUrl: '',
    condition: 'good' as AssetCondition,
    status: 'available' as AssetStatus,
    notes: '',
  })

  const { data: assetsData, isLoading } = useGetAssets({
    search: searchTerm,
    limit: 1000,
    enabled,
  })

  const { data: categoriesData } = useGetAssetCategories({
    limit: 1000,
    enabled: isModalOpen,
  })

  const { data: itemsData } = useGetAssetItemsDropdown({
    categoryId: formData.categoryId,
    enabled: isModalOpen && !!formData.categoryId,
  })

  const { data: vendorsData } = useGetAssetVendorsDropdown({
    categoryId: formData.categoryId,
    enabled: isModalOpen && !!formData.categoryId,
  })

  const createMutation = useCreateAsset()
  const updateMutation = useUpdateAsset()
  const deleteMutation = useDeleteAsset()

  const assets = assetsData?.data?.assets || []
  const categories = categoriesData?.data?.categories || []
  const items = itemsData?.data || []
  const vendors = vendorsData?.data || []

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAsset(null)
  }

  const handleSubmit = async () => {
    if (!editingAsset) {
      if (!formData.categoryId) {
        toast.error('Category is required')
        return
      }
      if (!formData.itemId) {
        toast.error('Item is required')
        return
      }
    }

    try {
      const payload = new FormData()

      if (!editingAsset) {
        payload.append('itemId', formData.itemId)
        if (formData.vendorId) {
          payload.append('vendorId', formData.vendorId)
        }
        payload.append('locationId', selectedLocationId || '')
      }

      if (formData.serialNumber) payload.append('serialNumber', formData.serialNumber)
      if (formData.assetTag) payload.append('assetTag', formData.assetTag)
      if (formData.purchaseDate) payload.append('purchaseDate', formData.purchaseDate)
      if (formData.purchasePrice) {
        payload.append('purchasePrice', String(parseFloat(formData.purchasePrice)))
        payload.append('currentValue', String(parseFloat(formData.purchasePrice)))
      }
      if (formData.warrantyEndDate) payload.append('warrantyEndDate', formData.warrantyEndDate)
      payload.append('condition', formData.condition)
      payload.append('status', formData.status)
      if (formData.notes) payload.append('notes', formData.notes)
      if (formData.warrantyDocument) {
        payload.append('warrantyDocument', formData.warrantyDocument)
      }

      if (editingAsset) {
        await updateMutation.mutateAsync({
          id: editingAsset.id,
          data: payload,
        })
        toast.success('Asset updated successfully')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Asset created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to save asset')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Asset deleted successfully')
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to delete asset')
    }
  }

  const getStatusBadge = (status: AssetStatus) => {
    const statusConfig: Record<string, string> = {
      available: 'bg-green-100 text-green-800 border-green-200',
      assigned: 'bg-blue-100 text-blue-800 border-blue-200',
      maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
      retired: 'bg-gray-100 text-gray-800 border-gray-200',
      disposed: 'bg-red-100 text-red-800 border-red-200',
    }
    return statusConfig[status] || statusConfig.available
  }

  const handleOpenModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset)
      setFormData({
        categoryId: asset.item?.category?.id || asset.item?.categoryId || '',
        itemId: asset.itemId,
        vendorId: asset.vendorId || '',
        serialNumber: asset.serialNumber || '',
        assetTag: asset.assetTag || '',
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
        purchasePrice: asset.purchasePrice?.toString() || '',
        warrantyEndDate: asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '',
        warrantyDocument: null,
        warrantyDocumentName: '',
        warrantyDocumentUrl: asset.warrantyDocumentUrl || '',
        condition: asset.condition,
        status: asset.status,
        notes: asset.notes || '',
      })
    } else {
      setEditingAsset(null)
      setFormData({
        categoryId: '',
        itemId: '',
        vendorId: '',
        serialNumber: '',
        assetTag: '',
        purchaseDate: '',
        purchasePrice: '',
        warrantyEndDate: '',
        warrantyDocument: null,
        warrantyDocumentName: '',
        warrantyDocumentUrl: '',
        condition: 'good',
        status: 'available',
        notes: '',
      })
    }
    setIsModalOpen(true)
  }

  const columns: ColumnDef<Asset>[] = [
    {
      accessorKey: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <div>
          <p className="font-medium truncate">{row.original.item?.name}</p>
          <p className="text-xs text-gray-500 truncate">{row.original.item?.model || '-'}</p>
        </div>
      ),
    },
    {
      id: 'serialTag',
      header: 'Serial/Tag',
      cell: ({ row }) => (
        <div className="text-xs truncate">{row.original.serialNumber || row.original.assetTag || '-'}</div>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => row.original.location?.name || '-',
    },
    {
      accessorKey: 'warrantyEndDate',
      header: 'Warranty End Date',
      cell: ({ row }) => formatDisplayDate(row.original.warrantyEndDate),
    },
    {
      id: 'warrantyDocument',
      header: 'Warranty Document',
      cell: ({ row }) =>
        row.original.warrantyDocumentUrl ? (
          <a
            href={row.original.warrantyDocumentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
          >
            View
          </a>
        ) : (
          '-'
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={getStatusBadge(row.original.status)}>{row.original.status}</Badge>,
    },
    {
      accessorKey: 'condition',
      header: 'Condition',
      cell: ({ row }) => <span className="capitalize">{row.original.condition}</span>,
    },
    {
      accessorKey: 'currentValue',
      header: 'Value',
      cell: ({ row }) => (row.original.currentValue ? `₹${row.original.currentValue.toLocaleString('en-IN')}` : '-'),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const asset = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(asset)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Edit asset"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(asset.id)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Delete asset"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </PermissionGuard>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={assets}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search assets..."
            filterActions={
              <div className="flex gap-2">
                <PermissionGuard permission="assets:create">
                  <Button variant="outline" onClick={() => setIsBulkUploadModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Add Assets
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission="assets:create">
                  <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                </PermissionGuard>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
            <DialogDescription>{editingAsset ? 'Update asset information' : 'Register a new asset'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="categoryId" className="mb-2">
                Category <span className="text-red-500">*</span>
              </Label>
              {editingAsset ? (
                <Input value={editingAsset.item?.category?.name || ''} disabled className="bg-gray-50" />
              ) : (
                <Select
                  value={formData.categoryId}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      categoryId: value,
                      itemId: '',
                      vendorId: '',
                    })
                  }
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select category first" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemId" className="mb-2">
                  Asset Item <span className="text-red-500">*</span>
                </Label>
                {editingAsset ? (
                  <Input
                    value={
                      editingAsset.item?.name
                        ? `${editingAsset.item.name}${editingAsset.item.model ? ` (${editingAsset.item.model})` : ''}`
                        : ''
                    }
                    disabled
                    className="bg-gray-50"
                  />
                ) : (
                  <Select
                    value={formData.itemId}
                    onValueChange={(value: string) => setFormData({ ...formData, itemId: value })}
                    disabled={!formData.categoryId}
                  >
                    <SelectTrigger className="w-[100%]">
                      <SelectValue placeholder={formData.categoryId ? 'Select asset item' : 'Select category first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} {item.model && `(${item.model})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="vendorId" className="mb-2">
                  Vendor (Optional)
                </Label>
                {editingAsset ? (
                  <Input value={editingAsset.vendor?.name || ''} disabled className="bg-gray-50" />
                ) : (
                  <Select
                    value={formData.vendorId}
                    onValueChange={(value: string) => setFormData({ ...formData, vendorId: value })}
                    disabled={!formData.categoryId}
                  >
                    <SelectTrigger className="w-[100%]">
                      <SelectValue
                        placeholder={formData.categoryId ? 'Select vendor (optional)' : 'Select category first'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serialNumber" className="mb-2">
                  Serial Number
                </Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="Serial number"
                />
              </div>

              <div>
                <Label htmlFor="assetTag" className="mb-2">
                  Asset Tag
                </Label>
                <Input
                  id="assetTag"
                  value={formData.assetTag}
                  onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                  placeholder="Asset tag"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseDate" className="mb-2">
                  Purchase Date
                </Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextPurchaseDate = e.target.value
                      const shouldResetWarrantyEndDate =
                        prev.warrantyEndDate && nextPurchaseDate && prev.warrantyEndDate <= nextPurchaseDate

                      return {
                        ...prev,
                        purchaseDate: nextPurchaseDate,
                        warrantyEndDate: shouldResetWarrantyEndDate ? '' : prev.warrantyEndDate,
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="purchasePrice" className="mb-2">
                  Purchase Price (₹)
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="warrantyEndDate" className="mb-2">
                  Warranty End Date
                </Label>
                <Input
                  id="warrantyEndDate"
                  type="date"
                  value={formData.warrantyEndDate}
                  min={
                    formData.purchaseDate
                      ? new Date(new Date(formData.purchaseDate).getTime() + 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      : undefined
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      warrantyEndDate: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="warrantyDocument" className="mb-2">
                  Warranty Document
                </Label>
                <Input
                  id="warrantyDocument"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setFormData({
                      ...formData,
                      warrantyDocument: file,
                      warrantyDocumentName: file?.name || '',
                    })
                  }}
                />
                {formData.warrantyDocumentName && (
                  <p className="text-xs text-gray-500 mt-1 truncate">Selected: {formData.warrantyDocumentName}</p>
                )}
                {!formData.warrantyDocumentName && formData.warrantyDocumentUrl && (
                  <a
                    href={formData.warrantyDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    View current document
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="condition" className="mb-2">
                  Condition <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      condition: value as AssetCondition,
                    })
                  }
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status" className="mb-2">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: string) => setFormData({ ...formData, status: value as AssetStatus })}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="mb-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingAsset ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkUploadModal open={isBulkUploadModalOpen} onOpenChange={setIsBulkUploadModalOpen} />
    </>
  )
}

export default AssetList
