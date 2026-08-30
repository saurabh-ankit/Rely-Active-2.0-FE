import { useState } from 'react'
import { CheckCircle, Edit, Plus, Trash2 } from 'lucide-react'
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
  useCompleteServiceLog,
  useCreateServiceLog,
  useDeleteServiceLog,
  useGetAssetCategories,
  useGetAssets,
  useGetAssetVendorsDropdown,
  useGetServiceLogs,
  useUpdateServiceLog,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { AssetServiceLog, CreateServiceLogRequest, ServiceType } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'

const ServiceLogs = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [completingLog, setCompletingLog] = useState<AssetServiceLog | null>(null)
  const [completionRemarks, setCompletionRemarks] = useState('')
  const [editingLog, setEditingLog] = useState<AssetServiceLog | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    assetId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    serviceType: 'repair' as ServiceType,
    performedBy: '',
    vendorId: '',
    cost: '',
    description: '',
    nextServiceDate: '',
  })
  const debouncedSearch = useDebounce(searchTerm, 500)
  const { data: serviceLogsData, isLoading } = useGetServiceLogs({
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

  const createMutation = useCreateServiceLog()
  const updateMutation = useUpdateServiceLog()
  const deleteMutation = useDeleteServiceLog()
  const completeMutation = useCompleteServiceLog()

  const serviceLogs = serviceLogsData?.data?.serviceLogs || []
  const categories = categoriesData?.data?.categories || []
  const assets = assetsData?.data?.assets || []
  const vendors = vendorsData?.data || []

  const getAssetOptionLabel = (asset: (typeof assets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = (log?: AssetServiceLog) => {
    if (log) {
      setEditingLog(log)
      setFormData({
        categoryId: log.asset?.item?.category?.id || log.asset?.item?.categoryId || '',
        assetId: log.assetId,
        serviceDate: new Date(log.serviceDate).toISOString().split('T')[0],
        serviceType: log.serviceType,
        performedBy: log.performedBy || '',
        vendorId: log.vendorId || '',
        cost: log.cost?.toString() || '',
        description: log.description || '',
        nextServiceDate: log.nextServiceDate ? new Date(log.nextServiceDate).toISOString().split('T')[0] : '',
      })
    } else {
      setEditingLog(null)
      setFormData({
        categoryId: '',
        assetId: '',
        serviceDate: new Date().toISOString().split('T')[0],
        serviceType: 'repair',
        performedBy: '',
        vendorId: '',
        cost: '',
        description: '',
        nextServiceDate: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingLog(null)
  }

  const handleSubmit = async () => {
    if (!editingLog && !formData.categoryId) {
      toast.error('Category is required')
      return
    }

    if (!formData.assetId || !formData.serviceDate || !formData.serviceType) {
      toast.error('Asset, Service Date, and Service Type are required')
      return
    }

    if (formData.nextServiceDate && formData.nextServiceDate <= formData.serviceDate) {
      toast.error('Next Service Date must be after Service Date')
      return
    }

    try {
      const payload: CreateServiceLogRequest = {
        assetId: formData.assetId,
        serviceDate: formData.serviceDate,
        serviceType: formData.serviceType,
      }

      if (formData.performedBy && formData.performedBy.trim()) {
        payload.performedBy = formData.performedBy.trim()
      }

      if (formData.vendorId && formData.vendorId.trim()) {
        payload.vendorId = formData.vendorId.trim()
      }

      if (formData.cost && formData.cost.trim()) {
        payload.cost = parseFloat(formData.cost)
      }

      if (formData.description && formData.description.trim()) {
        payload.description = formData.description.trim()
      }

      if (formData.nextServiceDate && formData.nextServiceDate.trim()) {
        payload.nextServiceDate = formData.nextServiceDate.trim()
      }

      if (editingLog) {
        await updateMutation.mutateAsync({
          id: editingLog.id,
          data: payload,
        })
        toast.success('Service log updated successfully')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Service log created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save service log'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service log?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Service log deleted successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete service log'
      toast.error(errorMessage)
    }
  }

  const handleOpenCompletionModal = (log: AssetServiceLog) => {
    setCompletingLog(log)
    setCompletionRemarks('')
    setIsCompletionModalOpen(true)
  }

  const handleCloseCompletionModal = () => {
    setIsCompletionModalOpen(false)
    setCompletingLog(null)
    setCompletionRemarks('')
  }

  const handleComplete = async () => {
    if (!completingLog) return

    if (!completionRemarks.trim()) {
      toast.error('Please provide completion remarks')
      return
    }

    try {
      await completeMutation.mutateAsync({
        id: completingLog.id,
        data: { completionRemarks: completionRemarks.trim() },
      })
      toast.success('Service log marked as completed. Asset is now available.')
      handleCloseCompletionModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete service log'
      toast.error(errorMessage)
    }
  }

  const serviceTypeLabels: Record<ServiceType, string> = {
    repair: 'Repair',
    preventive: 'Preventive',
    inspection: 'Inspection',
    cleaning: 'Cleaning',
    upgrade: 'Upgrade',
  }

  const columns: ColumnDef<AssetServiceLog>[] = [
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
      accessorKey: 'serviceType',
      header: 'Service Type',
      cell: ({ row }) => <Badge className="capitalize">{serviceTypeLabels[row.original.serviceType]}</Badge>,
    },
    {
      accessorKey: 'serviceDate',
      header: 'Service Date',
      cell: ({ row }) => formatDisplayDate(row.original.serviceDate),
    },
    {
      accessorKey: 'performedBy',
      header: 'Performed By',
      cell: ({ row }) => row.original.performedBy || '-',
    },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: ({ row }) => (row.original.cost ? `₹${row.original.cost.toLocaleString()}` : '-'),
    },
    {
      accessorKey: 'nextServiceDate',
      header: 'Next Service',
      cell: ({ row }) => (row.original.nextServiceDate ? formatDisplayDate(row.original.nextServiceDate) : '-'),
    },
    {
      accessorKey: 'completionStatus',
      header: 'Status',
      cell: ({ row }) => (
        <div>
          <Badge
            className={
              row.original.completionStatus === 'completed'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }
          >
            {row.original.completionStatus === 'completed' ? 'Completed' : 'Pending'}
          </Badge>
          {row.original.completionStatus === 'completed' && row.original.completedDate && (
            <p className="text-xs text-gray-500 mt-1">{formatDisplayDate(row.original.completedDate)}</p>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const log = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            {log.completionStatus === 'pending' && (
              <PermissionGuard permission="assets:update">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenCompletionModal(log)}
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            )}
            <PermissionGuard permission="assets:update">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(log)}
                disabled={log.completionStatus === 'completed'}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(log.id)}>
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
            data={serviceLogs}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search service logs..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Log
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
            <DialogTitle>{editingLog ? 'Edit Service Log' : 'Add Service Log'}</DialogTitle>
            <DialogDescription>
              {editingLog ? 'Update service log information' : 'Record a new service log'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 sm:px-6 py-4">
            <div>
              <Label htmlFor="categoryId" className="mb-2">
                Category <span className="text-red-500">*</span>
              </Label>
              {editingLog ? (
                <Input value={editingLog.asset?.item?.category?.name || ''} disabled className="bg-gray-50" />
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
                  <SelectTrigger className="w-[100%] !h-10">
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
              {editingLog ? (
                <Input
                  value={editingLog.asset ? getAssetOptionLabel(editingLog.asset) : ''}
                  disabled
                  className="bg-gray-50"
                />
              ) : (
                <Select
                  value={formData.assetId}
                  onValueChange={(value: string) => setFormData({ ...formData, assetId: value })}
                  disabled={!formData.categoryId}
                >
                  <SelectTrigger className="w-[100%] !h-10">
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

            <div className="grid grid-cols-2 gap-4 items-center ">
              <div>
                <Label htmlFor="serviceType" className="mb-2">
                  Service Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      serviceType: value as ServiceType,
                    })
                  }
                >
                  <SelectTrigger className="w-[100%] !h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="serviceDate" className="mb-2">
                  Service Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextServiceDateValue = e.target.value
                      const shouldResetNextDate = prev.nextServiceDate && prev.nextServiceDate <= nextServiceDateValue

                      return {
                        ...prev,
                        serviceDate: nextServiceDateValue,
                        nextServiceDate: shouldResetNextDate ? '' : prev.nextServiceDate,
                      }
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="performedBy" className="mb-2">
                  Performed By
                </Label>
                <Input
                  id="performedBy"
                  value={formData.performedBy}
                  onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
                  placeholder="Technician name"
                />
              </div>

              <div>
                <Label htmlFor="vendorId" className="mb-2">
                  Service Vendor
                </Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={(value: string) => setFormData({ ...formData, vendorId: value })}
                >
                  <SelectTrigger className="w-[100%] !h-10">
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
                <Label htmlFor="cost" className="mb-2">
                  Service Cost
                </Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="nextServiceDate" className="mb-2">
                  Next Service Date
                </Label>
                <Input
                  id="nextServiceDate"
                  type="date"
                  value={formData.nextServiceDate}
                  min={
                    formData.serviceDate
                      ? new Date(new Date(formData.serviceDate).getTime() + 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      : undefined
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nextServiceDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="mb-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Service details, issues found, work performed..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingLog ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Modal */}
      <Dialog open={isCompletionModalOpen} onOpenChange={setIsCompletionModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Mark Service as Completed</DialogTitle>
            <DialogDescription>
              Add remarks for this completed service. The asset will be marked as available once completed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 px-4 sm:px-6">
            {completingLog && (
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Asset:</p>
                <p className="font-medium">
                  {completingLog.asset?.serialNumber} - {completingLog.asset?.assetTag}
                </p>
                <p className="text-sm text-gray-600 mt-2">Service Type:</p>
                <p className="font-medium capitalize">{serviceTypeLabels[completingLog.serviceType]}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="completionRemarks">
                Completion Remarks <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="completionRemarks"
                value={completionRemarks}
                onChange={(e) => setCompletionRemarks(e.target.value)}
                placeholder="Describe what was done and the current status..."
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-gray-500">
                Provide details about the completed service, repairs made, or parts replaced.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCompletionModal}>
              Cancel
            </Button>
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ServiceLogs
