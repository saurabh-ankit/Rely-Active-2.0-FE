import { useState } from 'react'
import { AlertCircle, Edit, FileText, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  useCreateInspection,
  useDeleteInspection,
  useGetAssetCategories,
  useGetAssets,
  useGetInspections,
  useUpdateInspection,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { AssetComplianceInspection, CalibrationResult, InspectionType } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'

const Inspections = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInspection, setEditingInspection] = useState<AssetComplianceInspection | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    assetId: '',
    inspectionType: 'routine' as InspectionType,
    inspectorName: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    nextInspectionDate: '',
    result: 'pass' as CalibrationResult,
    findings: '',
    recommendations: '',
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [showDocumentInput, setShowDocumentInput] = useState(false)
  const debouncedSearch = useDebounce(searchTerm, 500)

  const { data: inspectionsData, isLoading } = useGetInspections({
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

  const createMutation = useCreateInspection()
  const updateMutation = useUpdateInspection()
  const deleteMutation = useDeleteInspection()

  const inspections = inspectionsData?.data?.inspections || []
  const categories = categoriesData?.data?.categories || []
  const assets = assetsData?.data?.assets || []

  const getAssetOptionLabel = (asset: (typeof assets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = (inspection?: AssetComplianceInspection) => {
    if (inspection) {
      setEditingInspection(inspection)
      setFormData({
        categoryId: inspection.asset?.item?.category?.id || inspection.asset?.item?.categoryId || '',
        assetId: inspection.assetId,
        inspectionType: inspection.inspectionType,
        inspectorName: inspection.inspectorName || '',
        inspectionDate: new Date(inspection.inspectionDate).toISOString().split('T')[0],
        nextInspectionDate: inspection.nextInspectionDate
          ? new Date(inspection.nextInspectionDate).toISOString().split('T')[0]
          : '',
        result: inspection.result,
        findings: inspection.findings || '',
        recommendations: inspection.recommendations || '',
      })
      setDocumentFile(null)
      setShowDocumentInput(false)
    } else {
      setEditingInspection(null)
      setFormData({
        categoryId: '',
        assetId: '',
        inspectionType: 'routine',
        inspectorName: '',
        inspectionDate: new Date().toISOString().split('T')[0],
        nextInspectionDate: '',
        result: 'pass',
        findings: '',
        recommendations: '',
      })
      setDocumentFile(null)
      setShowDocumentInput(false)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingInspection(null)
    setDocumentFile(null)
    setShowDocumentInput(false)
  }

  const handleSubmit = async () => {
    if (!editingInspection && !formData.categoryId) {
      toast.error('Category is required')
      return
    }

    if (!formData.assetId || !formData.inspectionDate) {
      toast.error('Asset and Inspection Date are required')
      return
    }

    if (formData.nextInspectionDate && formData.nextInspectionDate <= formData.inspectionDate) {
      toast.error('Next Inspection Date must be after Inspection Date')
      return
    }

    try {
      const submitData = new FormData()
      submitData.append('assetId', formData.assetId)
      submitData.append('inspectionType', formData.inspectionType)
      submitData.append('inspectionDate', formData.inspectionDate)
      submitData.append('result', formData.result)

      if (formData.inspectorName && formData.inspectorName.trim()) {
        submitData.append('inspectorName', formData.inspectorName.trim())
      }

      if (formData.nextInspectionDate && formData.nextInspectionDate.trim()) {
        submitData.append('nextInspectionDate', formData.nextInspectionDate.trim())
      }

      if (formData.findings && formData.findings.trim()) {
        submitData.append('findings', formData.findings.trim())
      }

      if (formData.recommendations && formData.recommendations.trim()) {
        submitData.append('recommendations', formData.recommendations.trim())
      }

      if (documentFile) {
        submitData.append('document', documentFile)
      }

      if (editingInspection) {
        await updateMutation.mutateAsync({
          id: editingInspection.id,
          data: submitData,
        })
        toast.success('Inspection updated successfully')
      } else {
        await createMutation.mutateAsync(submitData)
        toast.success('Inspection created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save inspection'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inspection?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Inspection deleted successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete inspection'
      toast.error(errorMessage)
    }
  }

  const inspectionTypeLabels: Record<InspectionType, string> = {
    routine: 'Routine',
    safety: 'Safety',
    regulatory: 'Regulatory',
    quality: 'Quality',
  }

  const resultLabels: Record<CalibrationResult, string> = {
    pass: 'Pass',
    fail: 'Fail',
  }

  const getResultColor = (result: CalibrationResult) => {
    switch (result) {
      case 'pass':
        return 'bg-green-100 text-green-800'
      case 'fail':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getInspectionStatus = (nextDate?: Date) => {
    if (!nextDate) return null
    const daysUntilDue = Math.ceil((new Date(nextDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilDue < 0) return 'overdue'
    if (daysUntilDue <= 30) return 'due_soon'
    return null
  }

  const columns: ColumnDef<AssetComplianceInspection>[] = [
    {
      accessorKey: 'asset',
      header: 'Asset',
      cell: ({ row }) => (
        <span>
          {row.original.asset ? `${row.original.asset.serialNumber || ''} - ${row.original.asset.assetTag || ''}` : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'inspectionType',
      header: 'Type',
      cell: ({ row }) => <Badge className="capitalize">{inspectionTypeLabels[row.original.inspectionType]}</Badge>,
    },
    {
      accessorKey: 'inspectorName',
      header: 'Inspector',
      cell: ({ row }) => row.original.inspectorName || '-',
    },
    {
      accessorKey: 'inspectionDate',
      header: 'Inspection Date',
      cell: ({ row }) => formatDisplayDate(row.original.inspectionDate),
    },
    {
      accessorKey: 'nextInspectionDate',
      header: 'Next Inspection',
      cell: ({ row }) => {
        const status = getInspectionStatus(
          row.original.nextInspectionDate ? new Date(row.original.nextInspectionDate) : undefined,
        )
        return (
          <div className="flex items-center gap-2">
            {row.original.nextInspectionDate ? formatDisplayDate(row.original.nextInspectionDate) : '-'}
            {status === 'overdue' && (
              <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            )}
            {status === 'due_soon' && (
              <Badge variant="outline" className="text-orange-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Due Soon
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: ({ row }) => (
        <Badge className={getResultColor(row.original.result)}>{resultLabels[row.original.result]}</Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const inspection = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(inspection)}>
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(inspection.id)}>
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
            data={inspections}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search inspections..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Inspection
                </Button>
              </PermissionGuard>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInspection ? 'Edit Inspection' : 'Add Inspection'}</DialogTitle>
            <DialogDescription>
              {editingInspection ? 'Update the inspection details' : 'Add a new inspection record'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 p-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryId">
                Category <span className="text-red-500">*</span>
              </Label>
              {editingInspection ? (
                <Input value={editingInspection.asset?.item?.category?.name || ''} disabled className="bg-gray-50" />
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

            <div className="grid gap-2">
              <Label htmlFor="asset">
                Asset <span className="text-red-500">*</span>
              </Label>
              {editingInspection ? (
                <Input
                  value={editingInspection.asset ? getAssetOptionLabel(editingInspection.asset) : ''}
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

            <div className="grid gap-2">
              <Label htmlFor="inspectionType">
                Inspection Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.inspectionType}
                onValueChange={(value: InspectionType) => setFormData({ ...formData, inspectionType: value })}
              >
                <SelectTrigger className="w-[100%]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="regulatory">Regulatory</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inspectorName">Inspector Name</Label>
              <Input
                id="inspectorName"
                value={formData.inspectorName}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                  setFormData({ ...formData, inspectorName: value })
                }}
                placeholder="Enter inspector name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inspectionDate">
                  Inspection Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextInspectionDateValue = e.target.value
                      const shouldResetNextDate =
                        prev.nextInspectionDate && prev.nextInspectionDate <= nextInspectionDateValue

                      return {
                        ...prev,
                        inspectionDate: nextInspectionDateValue,
                        nextInspectionDate: shouldResetNextDate ? '' : prev.nextInspectionDate,
                      }
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nextInspectionDate">Next Inspection Date</Label>
                <Input
                  id="nextInspectionDate"
                  type="date"
                  value={formData.nextInspectionDate}
                  min={
                    formData.inspectionDate
                      ? new Date(new Date(formData.inspectionDate).getTime() + 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      : undefined
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nextInspectionDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="result">
                Result <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.result}
                onValueChange={(value: CalibrationResult) => setFormData({ ...formData, result: value })}
              >
                <SelectTrigger className="w-[100%]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="findings">Findings</Label>
              <Textarea
                id="findings"
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                placeholder="Describe inspection findings..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                id="recommendations"
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                placeholder="Any recommendations..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inspectionDocument">Inspection Document</Label>
              <div className="space-y-3">
                {!documentFile && editingInspection?.documentUrl && !showDocumentInput && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {editingInspection.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={editingInspection.documentUrl}
                            alt="Inspection Document"
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
                          href={editingInspection.documentUrl}
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

                {(!editingInspection?.documentUrl || showDocumentInput || documentFile) && (
                  <>
                    <Input
                      id="inspectionDocument"
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
                            if (editingInspection?.documentUrl) {
                              setShowDocumentInput(false)
                            }
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {!documentFile && !editingInspection?.documentUrl && (
                      <p className="text-xs text-gray-500">Select a file from your local machine</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {formData.result === 'fail' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed inspections require immediate attention and corrective actions.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingInspection ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Inspections
