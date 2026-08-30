import { DataTable } from '@/components/ui/data-table'
import { useRef, useState } from 'react'
import { Edit, FileText, Plus, Trash2, X } from 'lucide-react'
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
  useCreateWarranty,
  useDeleteWarranty,
  useGetAssetCategories,
  useGetAssets,
  useGetAssetVendorsDropdown,
  useGetWarranties,
  useUpdateWarranty,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import type { AssetWarranty, WarrantyType } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'

const Warranties = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWarranty, setEditingWarranty] = useState<AssetWarranty | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    assetId: '',
    vendorId: '',
    warrantyStartDate: '',
    warrantyEndDate: '',
    warrantyType: 'manufacturer' as WarrantyType,
    coverageDetails: '',
    documentUrl: '',
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [showDocumentInput, setShowDocumentInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchTerm, 500)

  const { data: warrantiesData, isLoading } = useGetWarranties({
    search: debouncedSearch,
    limit: 1000,
  })

  const { data: categoriesData } = useGetAssetCategories({
    limit: 1000,
    enabled: isModalOpen,
  })

  const { data: assetsData } = useGetAssets({
    categoryId: formData.categoryId,
    limit: 1000,
    enabled: isModalOpen && !!formData.categoryId,
  })

  const { data: vendorsData } = useGetAssetVendorsDropdown({
    enabled: isModalOpen,
  })

  const createMutation = useCreateWarranty()
  const updateMutation = useUpdateWarranty()
  const deleteMutation = useDeleteWarranty()

  const warranties = warrantiesData?.data?.warranties || []
  const categories = categoriesData?.data?.categories || []
  const assets = assetsData?.data?.assets || []
  const vendors = vendorsData?.data || []

  const getAssetOptionLabel = (asset: (typeof assets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = (warranty?: AssetWarranty) => {
    if (warranty) {
      setEditingWarranty(warranty)
      setFormData({
        categoryId: warranty.asset?.item?.category?.id || warranty.asset?.item?.categoryId || '',
        assetId: warranty.assetId,
        vendorId: warranty.vendorId || '',
        warrantyStartDate: new Date(warranty.warrantyStartDate).toISOString().split('T')[0],
        warrantyEndDate: new Date(warranty.warrantyEndDate).toISOString().split('T')[0],
        warrantyType: warranty.warrantyType,
        coverageDetails: warranty.coverageDetails || '',
        documentUrl: warranty.documentUrl || '',
      })
      setDocumentFile(null)
      setShowDocumentInput(false)
    } else {
      setEditingWarranty(null)
      setFormData({
        categoryId: '',
        assetId: '',
        vendorId: '',
        warrantyStartDate: '',
        warrantyEndDate: '',
        warrantyType: 'manufacturer',
        coverageDetails: '',
        documentUrl: '',
      })
      setDocumentFile(null)
      setShowDocumentInput(false)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingWarranty(null)
    setDocumentFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setShowDocumentInput(false)
  }

  const handleSubmit = async () => {
    if (!editingWarranty && !formData.categoryId) {
      toast.error('Category is required')
      return
    }

    if (!formData.assetId || !formData.warrantyStartDate || !formData.warrantyEndDate) {
      toast.error('Asset, Start Date, and End Date are required')
      return
    }

    if (formData.warrantyEndDate <= formData.warrantyStartDate) {
      toast.error('End Date must be after Start Date')
      return
    }

    try {
      const submitData = new FormData()
      submitData.append('assetId', formData.assetId)
      submitData.append('warrantyStartDate', formData.warrantyStartDate)
      submitData.append('warrantyEndDate', formData.warrantyEndDate)
      submitData.append('warrantyType', formData.warrantyType)

      if (formData.vendorId && formData.vendorId.trim()) {
        submitData.append('vendorId', formData.vendorId.trim())
      }

      if (formData.coverageDetails && formData.coverageDetails.trim()) {
        submitData.append('coverageDetails', formData.coverageDetails.trim())
      }

      if (documentFile) {
        submitData.append('document', documentFile)
      } else if (formData.documentUrl && formData.documentUrl.trim()) {
        submitData.append('documentUrl', formData.documentUrl.trim())
      }

      if (editingWarranty) {
        await updateMutation.mutateAsync({
          id: editingWarranty.id,
          data: submitData,
        })
        toast.success('Warranty updated successfully')
      } else {
        await createMutation.mutateAsync(submitData)
        toast.success('Warranty created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save warranty'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warranty?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Warranty deleted successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete warranty'
      toast.error(errorMessage)
    }
  }

  const warrantyTypeLabels: Record<WarrantyType, string> = {
    manufacturer: 'Manufacturer',
    extended: 'Extended',
    service_contract: 'Service Contract',
  }

  const isWarrantyActive = (endDate: string) => {
    return new Date(endDate) >= new Date()
  }

  const columns: ColumnDef<AssetWarranty>[] = [
    {
      accessorKey: 'asset',
      header: 'Asset',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.asset?.serialNumber || row.original.asset?.assetTag || '-'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'warrantyType',
      header: 'Warranty Type',
      cell: ({ row }) => <Badge className="capitalize">{warrantyTypeLabels[row.original.warrantyType]}</Badge>,
    },
    {
      accessorKey: 'warrantyStartDate',
      header: 'Start Date',
      cell: ({ row }) => formatDisplayDate(row.original.warrantyStartDate),
    },
    {
      accessorKey: 'warrantyEndDate',
      header: 'End Date',
      cell: ({ row }) => formatDisplayDate(row.original.warrantyEndDate),
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => row.original.vendor?.name || '-',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        isWarrantyActive(row.original.warrantyEndDate) ? (
          <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800 border-red-200">Expired</Badge>
        ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const warranty = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(warranty)}>
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(warranty.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
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
            data={warranties}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search warranties..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Warranty
                </Button>
              </PermissionGuard>
            }
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWarranty ? 'Edit Warranty' : 'Add Warranty'}</DialogTitle>
            <DialogDescription>
              {editingWarranty ? 'Update warranty information' : 'Register a new warranty'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="categoryId" className="mb-2">
                Category <span className="text-red-500">*</span>
              </Label>
              {editingWarranty ? (
                <Input value={editingWarranty.asset?.item?.category?.name || ''} disabled className="bg-gray-50" />
              ) : (
                <Select
                  value={formData.categoryId}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      categoryId: value,
                      assetId: '',
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

            <div>
              <Label htmlFor="assetId" className="mb-2">
                Asset <span className="text-red-500">*</span>
              </Label>
              {editingWarranty ? (
                <Input
                  value={editingWarranty.asset ? getAssetOptionLabel(editingWarranty.asset) : ''}
                  disabled
                  className="bg-gray-50"
                />
              ) : (
                <Select
                  value={formData.assetId}
                  onValueChange={(value: string) => setFormData({ ...formData, assetId: value })}
                  disabled={!formData.categoryId}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue
                      placeholder={
                        formData.categoryId ? 'item name - serial number - asset tag' : 'Select category first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.length === 0 ? (
                      <SelectItem value="__no_assets__" disabled>
                        No Asset Found
                      </SelectItem>
                    ) : (
                      assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {getAssetOptionLabel(asset)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="warrantyType" className="mb-2">
                  Warranty Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.warrantyType}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      warrantyType: value as WarrantyType,
                    })
                  }
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                    <SelectItem value="service_contract">Service Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vendorId" className="mb-2">
                  Warranty Vendor
                </Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={(value: string) => setFormData({ ...formData, vendorId: value })}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="warrantyStartDate" className="mb-2">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="warrantyStartDate"
                  type="date"
                  value={formData.warrantyStartDate}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextStartDate = e.target.value
                      const shouldResetEndDate = prev.warrantyEndDate && prev.warrantyEndDate <= nextStartDate

                      return {
                        ...prev,
                        warrantyStartDate: nextStartDate,
                        warrantyEndDate: shouldResetEndDate ? '' : prev.warrantyEndDate,
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="warrantyEndDate" className="mb-2">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="warrantyEndDate"
                  type="date"
                  value={formData.warrantyEndDate}
                  min={
                    formData.warrantyStartDate
                      ? new Date(new Date(formData.warrantyStartDate).getTime() + 24 * 60 * 60 * 1000)
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
            </div>

            <div>
              <Label htmlFor="coverageDetails" className="mb-2">
                Coverage Details
              </Label>
              <Textarea
                id="coverageDetails"
                value={formData.coverageDetails}
                onChange={(e) => setFormData({ ...formData, coverageDetails: e.target.value })}
                placeholder="What is covered under this warranty..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="warrantyDocument">Warranty Document</Label>
              <div className="space-y-3">
                {!documentFile && editingWarranty?.documentUrl && !showDocumentInput && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {editingWarranty.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={editingWarranty.documentUrl}
                            alt="Warranty Document"
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">Existing document</p>
                        <a
                          href={editingWarranty.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 truncate block"
                        >
                          View Document
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDocumentInput(true)}
                        className="flex-shrink-0"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}

                {(!editingWarranty?.documentUrl || showDocumentInput || documentFile) && (
                  <>
                    <Input
                      ref={fileInputRef}
                      id="warrantyDocument"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const selectedFile = e.target.files ? e.target.files[0] : null
                        setDocumentFile(selectedFile)
                        if (selectedFile) {
                          setShowDocumentInput(false)
                        }
                      }}
                    />
                    {documentFile && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        {documentFile.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(documentFile)}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{documentFile.name}</p>
                          <p className="text-xs text-gray-500">{(documentFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDocumentFile(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                            if (editingWarranty?.documentUrl) {
                              setShowDocumentInput(false)
                            }
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {!documentFile && !editingWarranty?.documentUrl && (
                      <p className="text-xs text-gray-500">Select a file from your local machine</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingWarranty ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Warranties
