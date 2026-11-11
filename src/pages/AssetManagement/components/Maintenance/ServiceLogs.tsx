import { useRef, useState, type ChangeEvent } from 'react'
import { CheckCircle, Edit, Plus, QrCode, Trash2, Upload, X } from 'lucide-react'
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
  useCreateItemRequest,
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
  const [gatePassLog, setGatePassLog] = useState<AssetServiceLog | null>(null)
  const [gatePassPhone, setGatePassPhone] = useState('')
  const [gatePassImage, setGatePassImage] = useState('')
  const [performedByError, setPerformedByError] = useState('')
  const gatePassFileInputRef = useRef<HTMLInputElement>(null)
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
    status: 'available',
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
  const createGatePassMutation = useCreateItemRequest()

  const serviceLogs = serviceLogsData?.data?.serviceLogs || []
  const categories = categoriesData?.data?.categories || []
  const assets = assetsData?.data?.assets || []
  const vendors = vendorsData?.data || []

  const getAssetOptionLabel = (asset: (typeof assets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = (log?: AssetServiceLog) => {
    setPerformedByError('')
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
    setPerformedByError('')
  }

  const isScrapType = formData.serviceType === 'scrap'

  const handleSubmit = async () => {
    if (!editingLog && !formData.categoryId) {
      toast.error('Category is required')
      return
    }

    if (!formData.assetId || !formData.serviceType) {
      toast.error('Asset and Service Type are required')
      return
    }

    if (!formData.performedBy.trim()) {
      setPerformedByError('Performed By is required')
      return
    }
    setPerformedByError('')

    if (!isScrapType && !formData.serviceDate) {
      toast.error('Service Date is required')
      return
    }

    if (
      !isScrapType &&
      formData.nextServiceDate &&
      formData.serviceDate &&
      formData.nextServiceDate <= formData.serviceDate
    ) {
      toast.error('Next Service Date must be after Service Date')
      return
    }

    try {
      const payload: CreateServiceLogRequest = {
        assetId: formData.assetId,
        // BE requires serviceDate; for scrap use today when the field is hidden
        serviceDate: isScrapType ? new Date().toISOString().split('T')[0] : formData.serviceDate,
        serviceType: formData.serviceType,
        performedBy: formData.performedBy.trim(),
      }

      if (!isScrapType && formData.vendorId && formData.vendorId.trim()) {
        payload.vendorId = formData.vendorId.trim()
      }

      if (!isScrapType && formData.cost && formData.cost.trim()) {
        payload.cost = parseFloat(formData.cost)
      }

      if (formData.description && formData.description.trim()) {
        payload.description = formData.description.trim()
      }

      if (!isScrapType && formData.nextServiceDate && formData.nextServiceDate.trim()) {
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
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to save service log'
      if (errorMessage.toLowerCase().includes('performed by')) {
        setPerformedByError(errorMessage)
        return
      }
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
      toast.success(
        completingLog.serviceType === 'scrap'
          ? 'Service log marked as completed. Asset remains scrap.'
          : completingLog.serviceType === 'repair'
            ? 'Service log marked as completed. Asset is now available.'
            : 'Service log marked as completed.',
      )
      handleCloseCompletionModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete service log'
      toast.error(errorMessage)
    }
  }

  const handleOpenGatePassModal = (log: AssetServiceLog) => {
    if (!log.performedBy?.trim()) {
      toast.error('Performed By is required to generate a gate pass')
      return
    }
    setGatePassLog(log)
    setGatePassPhone('')
    setGatePassImage('')
    if (gatePassFileInputRef.current) gatePassFileInputRef.current.value = ''
  }

  const handleCloseGatePassModal = () => {
    setGatePassLog(null)
    setGatePassPhone('')
    setGatePassImage('')
    if (gatePassFileInputRef.current) gatePassFileInputRef.current.value = ''
  }

  const handleGatePassPhoneChange = (value: string) => {
    setGatePassPhone(value.replace(/\D/g, '').slice(0, 10))
  }

  const handleGatePassImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setGatePassImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const clearGatePassImage = () => {
    setGatePassImage('')
    if (gatePassFileInputRef.current) gatePassFileInputRef.current.value = ''
  }

  const handleGenerateGatePass = async () => {
    if (!gatePassLog) return

    const name = gatePassLog.performedBy?.trim() || ''
    const phone = gatePassPhone.trim()

    if (!name) {
      toast.error('Performed By is required to generate a gate pass')
      return
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      toast.error('Performed By can only contain alphabets for gate pass name')
      return
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error('Phone must be exactly 10 digits')
      return
    }
    if (!gatePassLog.assetId) {
      toast.error('Asset is required to generate a gate pass')
      return
    }

    try {
      await createGatePassMutation.mutateAsync({
        name,
        phone,
        assetIds: [gatePassLog.assetId],
        reason: 'repair',
        problem: gatePassLog.description?.trim() || undefined,
        requestImage: gatePassImage || undefined,
      })
      handleCloseGatePassModal()
    } catch {
      // toast handled in mutation
    }
  }

  const serviceTypeLabels: Record<ServiceType, string> = {
    repair: 'Repair',
    preventive: 'Preventive',
    inspection: 'Inspection',
    cleaning: 'Cleaning',
    upgrade: 'Upgrade',
    scrap: 'Scrap',
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
      cell: ({ row }) => {
        const log = row.original

        // Scrap is terminal — always show Scrapped.
        if (log.serviceType === 'scrap') {
          return <Badge className="bg-red-100 text-red-800 border-red-200">Scrapped</Badge>
        }

        // Open logs show status from the selected service type (e.g. Repair).
        if (log.completionStatus !== 'completed') {
          const pendingStatusClass: Partial<Record<ServiceType, string>> = {
            repair: 'bg-amber-100 text-amber-800 border-amber-200',
            preventive: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            inspection: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            cleaning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            upgrade: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          }

          return (
            <Badge className={pendingStatusClass[log.serviceType] || 'bg-yellow-100 text-yellow-800 border-yellow-200'}>
              {serviceTypeLabels[log.serviceType]}
            </Badge>
          )
        }

        return (
          <div>
            <Badge className="bg-green-100 text-green-800">Completed</Badge>
            {log.completedDate && <p className="text-xs text-gray-500 mt-1">{formatDisplayDate(log.completedDate)}</p>}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const log = row.original
        const isScrap = log.serviceType === 'scrap'
        const showGatePass = isScrap || log.completionStatus === 'pending'
        const showComplete = !isScrap && log.completionStatus === 'pending'
        return (
          <div className="flex justify-end gap-2 pr-2">
            {showGatePass && (
              <PermissionGuard permission="assets:create">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenGatePassModal(log)}
                  className="text-blue-600 hover:text-blue-700"
                  title="Generate gate pass"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            )}
            {showComplete && (
              <PermissionGuard permission="assets:update">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenCompletionModal(log)}
                  className="text-green-600 hover:text-green-700"
                  title="Mark as completed"
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
                disabled={!isScrap && log.completionStatus === 'completed'}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(log.id)} title="Delete">
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

            <div className={`grid gap-4 items-center ${isScrapType ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
                      ...(value === 'scrap' ? { vendorId: '', cost: '', nextServiceDate: '' } : {}),
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
                    <SelectItem value="scrap">Scrap</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isScrapType && (
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
              )}
            </div>

            <div className={`grid gap-4 ${isScrapType ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div>
                <Label htmlFor="performedBy" className="mb-2">
                  Performed By <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="performedBy"
                  value={formData.performedBy}
                  onChange={(e) => {
                    setFormData({ ...formData, performedBy: e.target.value })
                    if (performedByError) setPerformedByError('')
                  }}
                  placeholder="Technician name"
                  className={performedByError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {performedByError && <p className="mt-1 text-xs text-red-500">{performedByError}</p>}
              </div>

              {!isScrapType && (
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
              )}
            </div>

            {!isScrapType && (
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
            )}

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
              {completingLog?.serviceType === 'scrap'
                ? 'Add remarks for this completed scrap service. The asset status will remain scrap.'
                : completingLog?.serviceType === 'repair'
                  ? 'Add remarks for this completed service. The asset will be marked as available once completed.'
                  : 'Add remarks for this completed service.'}
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

      {/* Generate Gate Pass Modal */}
      <Dialog
        open={!!gatePassLog}
        onOpenChange={(open) => {
          if (!open) handleCloseGatePassModal()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Gate Pass</DialogTitle>
            <DialogDescription>
              Create a gate pass for this service log. Name is taken from Performed By.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-1 py-2">
            {gatePassLog && (
              <div className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
                <p>
                  <span className="text-gray-600">Asset:</span>{' '}
                  <span className="font-medium">
                    {gatePassLog.asset ? getAssetOptionLabel(gatePassLog.asset) : gatePassLog.assetId || '—'}
                  </span>
                </p>
                <p>
                  <span className="text-gray-600">Performed By:</span>{' '}
                  <span className="font-medium">{gatePassLog.performedBy || '—'}</span>
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="gate-pass-phone" className="mb-2">
                Phone
              </Label>
              <Input
                id="gate-pass-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={gatePassPhone}
                onChange={(e) => handleGatePassPhoneChange(e.target.value)}
                placeholder="10-digit phone number (optional)"
              />
            </div>

            <div>
              <Label className="mb-2">Upload File</Label>
              <div className="flex items-start gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => gatePassFileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {gatePassImage ? 'Change Image' : 'Upload Image'}
                </Button>
                <input
                  ref={gatePassFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGatePassImageChange}
                />
                {gatePassImage ? (
                  <div className="relative">
                    <img
                      src={gatePassImage}
                      alt="Gate pass attachment"
                      className="h-16 w-16 rounded-md object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={clearGatePassImage}
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
            <Button variant="outline" onClick={handleCloseGatePassModal} disabled={createGatePassMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleGenerateGatePass} disabled={createGatePassMutation.isPending}>
              {createGatePassMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ServiceLogs
