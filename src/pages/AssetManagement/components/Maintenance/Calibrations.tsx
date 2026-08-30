import { useState } from 'react'
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
  useCreateCalibration,
  useDeleteCalibration,
  useGetAssetCategories,
  useGetAssets,
  useGetCalibrations,
  useUpdateCalibration,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { AssetCalibration, CalibrationResult } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'

const Calibrations = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCalibration, setEditingCalibration] = useState<AssetCalibration | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    assetId: '',
    calibrationDate: new Date().toISOString().split('T')[0],
    calibratedBy: '',
    result: 'pass' as CalibrationResult,
    remarks: '',
    nextCalibrationDate: '',
    certificateNumber: '',
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [showDocumentInput, setShowDocumentInput] = useState(false)
  const debouncedSearch = useDebounce(searchTerm, 500)

  const { data: calibrationsData, isLoading } = useGetCalibrations({
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

  const createMutation = useCreateCalibration()
  const updateMutation = useUpdateCalibration()
  const deleteMutation = useDeleteCalibration()

  const calibrations = calibrationsData?.data?.calibrations || []
  const categories = categoriesData?.data?.categories || []
  const assets = assetsData?.data?.assets || []

  const getAssetOptionLabel = (asset: (typeof assets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = (calibration?: AssetCalibration) => {
    if (calibration) {
      setEditingCalibration(calibration)
      setFormData({
        categoryId: calibration.asset?.item?.category?.id || calibration.asset?.item?.categoryId || '',
        assetId: calibration.assetId,
        calibrationDate: new Date(calibration.calibrationDate).toISOString().split('T')[0],
        calibratedBy: calibration.calibratedBy || '',
        result: calibration.result,
        remarks: calibration.notes || '',
        nextCalibrationDate: calibration.nextCalibrationDate
          ? new Date(calibration.nextCalibrationDate).toISOString().split('T')[0]
          : '',
        certificateNumber: calibration.certificateNumber || '',
      })
      setDocumentFile(null)
      setShowDocumentInput(false)
    } else {
      setEditingCalibration(null)
      setFormData({
        categoryId: '',
        assetId: '',
        calibrationDate: new Date().toISOString().split('T')[0],
        calibratedBy: '',
        result: 'pass',
        remarks: '',
        nextCalibrationDate: '',
        certificateNumber: '',
      })
      setDocumentFile(null)
      setShowDocumentInput(false)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCalibration(null)
    setDocumentFile(null)
    setShowDocumentInput(false)
  }

  const handleSubmit = async () => {
    if (!editingCalibration && !formData.categoryId) {
      toast.error('Category is required')
      return
    }

    if (!formData.assetId || !formData.calibrationDate) {
      toast.error('Asset and Calibration Date are required')
      return
    }

    if (formData.nextCalibrationDate && formData.nextCalibrationDate <= formData.calibrationDate) {
      toast.error('Next Calibration Date must be after Calibration Date')
      return
    }

    try {
      const submitData = new FormData()
      submitData.append('assetId', formData.assetId)
      submitData.append('calibrationDate', formData.calibrationDate)
      submitData.append('result', formData.result)

      if (formData.calibratedBy && formData.calibratedBy.trim()) {
        submitData.append('calibratedBy', formData.calibratedBy.trim())
      }

      if (formData.remarks && formData.remarks.trim()) {
        submitData.append('notes', formData.remarks.trim())
      }

      if (formData.nextCalibrationDate && formData.nextCalibrationDate.trim()) {
        submitData.append('nextCalibrationDate', formData.nextCalibrationDate.trim())
      }

      if (formData.certificateNumber && formData.certificateNumber.trim()) {
        submitData.append('certificateNumber', formData.certificateNumber.trim())
      }

      if (editingCalibration?.documentUrl && !documentFile) {
        submitData.append('documentUrl', editingCalibration.documentUrl)
      }

      if (documentFile) {
        submitData.append('document', documentFile)
      }

      if (editingCalibration) {
        await updateMutation.mutateAsync({
          id: editingCalibration.id,
          data: submitData,
        })
        toast.success('Calibration updated successfully')
      } else {
        await createMutation.mutateAsync(submitData)
        toast.success('Calibration created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save calibration'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this calibration?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Calibration deleted successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete calibration'
      toast.error(errorMessage)
    }
  }

  const resultLabels: Record<CalibrationResult, string> = {
    pass: 'Pass',
    fail: 'Fail',
  }

  const getCalibrationStatus = (nextDate: string | undefined) => {
    if (!nextDate) return null
    const daysUntil = Math.ceil((new Date(nextDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return 'overdue'
    if (daysUntil <= 30) return 'due_soon'
    return null
  }

  const columns: ColumnDef<AssetCalibration>[] = [
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
      accessorKey: 'calibrationDate',
      header: 'Calibration Date',
      cell: ({ row }) => formatDisplayDate(row.original.calibrationDate),
    },
    {
      accessorKey: 'calibratedBy',
      header: 'Calibrated By',
      cell: ({ row }) => row.original.calibratedBy || '-',
    },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: ({ row }) => (
        <Badge
          className={
            row.original.result === 'pass'
              ? 'bg-green-100 text-green-800 border-green-200'
              : row.original.result === 'fail'
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
          }
        >
          {resultLabels[row.original.result]}
        </Badge>
      ),
    },
    {
      accessorKey: 'certificateNumber',
      header: 'Certificate No.',
      cell: ({ row }) => row.original.certificateNumber || '-',
    },
    {
      accessorKey: 'nextCalibrationDate',
      header: 'Next Calibration',
      cell: ({ row }) =>
        row.original.nextCalibrationDate ? (
          <div>
            <p>{formatDisplayDate(row.original.nextCalibrationDate)}</p>
            {getCalibrationStatus(row.original.nextCalibrationDate) === 'overdue' && (
              <Badge variant="outline" className="mt-1 bg-red-50 text-red-800 border-red-200">
                Overdue
              </Badge>
            )}
            {getCalibrationStatus(row.original.nextCalibrationDate) === 'due_soon' && (
              <Badge variant="outline" className="mt-1 bg-orange-50 text-orange-800 border-orange-200">
                Due Soon
              </Badge>
            )}
          </div>
        ) : (
          '-'
        ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const calibration = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(calibration)}>
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(calibration.id)}>
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
            data={calibrations}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search calibrations..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Calibration
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
            <DialogTitle>{editingCalibration ? 'Edit Calibration' : 'Add Calibration'}</DialogTitle>
            <DialogDescription>
              {editingCalibration ? 'Update calibration information' : 'Record a new calibration'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="categoryId" className="mb-2">
                Category <span className="text-red-500">*</span>
              </Label>
              {editingCalibration ? (
                <Input value={editingCalibration.asset?.item?.category?.name || ''} disabled className="bg-gray-50" />
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
              {editingCalibration ? (
                <Input
                  value={editingCalibration.asset ? getAssetOptionLabel(editingCalibration.asset) : ''}
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
                <Label htmlFor="calibrationDate" className="mb-2">
                  Calibration Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="calibrationDate"
                  type="date"
                  value={formData.calibrationDate}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextCalibrationDateValue = e.target.value
                      const shouldResetNextDate =
                        prev.nextCalibrationDate && prev.nextCalibrationDate <= nextCalibrationDateValue

                      return {
                        ...prev,
                        calibrationDate: nextCalibrationDateValue,
                        nextCalibrationDate: shouldResetNextDate ? '' : prev.nextCalibrationDate,
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="calibratedBy" className="mb-2">
                  Calibrated By
                </Label>
                <Input
                  id="calibratedBy"
                  value={formData.calibratedBy}
                  onChange={(e) => setFormData({ ...formData, calibratedBy: e.target.value })}
                  placeholder="Technician/Company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="result" className="mb-2">
                  Result *
                </Label>
                <Select
                  value={formData.result}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      result: value as CalibrationResult,
                    })
                  }
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="certificateNumber" className="mb-2">
                  Certificate Number
                </Label>
                <Input
                  id="certificateNumber"
                  value={formData.certificateNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      certificateNumber: e.target.value,
                    })
                  }
                  placeholder="CERT-12345"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="nextCalibrationDate" className="mb-2">
                Next Calibration Date
              </Label>
              <Input
                id="nextCalibrationDate"
                type="date"
                value={formData.nextCalibrationDate}
                min={
                  formData.calibrationDate
                    ? new Date(new Date(formData.calibrationDate).getTime() + 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0]
                    : undefined
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nextCalibrationDate: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="remarks" className="mb-2">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Calibration notes, findings, adjustments made..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="calibrationDocument" className="mb-2">
                Calibration Document (Optional)
              </Label>
              <div className="space-y-3">
                {!documentFile && editingCalibration?.documentUrl && !showDocumentInput && (
                  <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {editingCalibration.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                          src={editingCalibration.documentUrl}
                          alt="Calibration Document"
                          className="w-14 h-14 object-cover rounded-md border border-gray-200"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-200 rounded-md flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">Existing document</span>
                        <a
                          href={editingCalibration.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowDocumentInput(true)}>
                      Change
                    </Button>
                  </div>
                )}

                {(!editingCalibration?.documentUrl || showDocumentInput || documentFile) && (
                  <>
                    <Input
                      id="calibrationDocument"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setDocumentFile(file)
                        if (file) {
                          setShowDocumentInput(false)
                        }
                      }}
                    />
                    {documentFile && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                        {documentFile.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(documentFile)}
                            alt="Calibration Document Preview"
                            className="w-12 h-12 object-cover rounded-md border border-gray-200"
                          />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-500" />
                        )}
                        <span className="text-sm text-gray-700 flex-1 truncate">{documentFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDocumentFile(null)
                            if (editingCalibration?.documentUrl) {
                              setShowDocumentInput(false)
                            }
                          }}
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {!documentFile && !editingCalibration?.documentUrl && (
                      <p className="text-xs text-gray-500">
                        Upload calibration certificate or report (PDF, image, or DOC).
                      </p>
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
              {editingCalibration ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Calibrations
