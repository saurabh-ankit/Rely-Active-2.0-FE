import { useState } from 'react'
import { Edit, Plus, Trash2 } from 'lucide-react'
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
  useCreateTraining,
  useDeleteTraining,
  useGetAssetCategories,
  useGetAssets,
  useGetTraining,
  useUpdateTraining,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { AssetComplianceTraining, CreateTrainingRequest, TrainingRequiredFor } from '@/lib/types'

const Training = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTraining, setEditingTraining] = useState<AssetComplianceTraining | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    assetId: '',
    trainingTitle: '',
    requiredFor: 'all_staff' as TrainingRequiredFor,
    validityPeriod: '',
    notes: '',
  })
  const debouncedSearch = useDebounce(searchTerm, 500)

  const { data: trainingData, isLoading } = useGetTraining({
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

  const createMutation = useCreateTraining()
  const updateMutation = useUpdateTraining()
  const deleteMutation = useDeleteTraining()

  const trainings = trainingData?.data?.training || []
  const categories = categoriesData?.data?.categories || []
  const assets = assetsData?.data?.assets || []

  const getAssetOptionLabel = (asset: (typeof assets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = (training?: AssetComplianceTraining) => {
    if (training) {
      setEditingTraining(training)
      setFormData({
        categoryId: training.asset?.item?.category?.id || training.asset?.item?.categoryId || '',
        assetId: training.assetId,
        trainingTitle: training.trainingTitle,
        requiredFor: training.requiredFor,
        validityPeriod: training.validityPeriod?.toString() || '',
        notes: training.notes || '',
      })
    } else {
      setEditingTraining(null)
      setFormData({
        categoryId: '',
        assetId: '',
        trainingTitle: '',
        requiredFor: 'all_staff',
        validityPeriod: '',
        notes: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTraining(null)
  }

  const handleSubmit = async () => {
    if (!editingTraining && !formData.categoryId) {
      toast.error('Category is required')
      return
    }

    if (!formData.assetId || !formData.trainingTitle) {
      toast.error('Asset and Training Title are required')
      return
    }

    try {
      const payload: CreateTrainingRequest = {
        assetId: formData.assetId,
        trainingTitle: formData.trainingTitle.trim(),
        requiredFor: formData.requiredFor,
      }

      if (formData.validityPeriod && formData.validityPeriod.trim()) {
        payload.validityPeriod = parseInt(formData.validityPeriod)
      }

      if (formData.notes && formData.notes.trim()) {
        payload.notes = formData.notes.trim()
      }

      if (editingTraining) {
        await updateMutation.mutateAsync({
          id: editingTraining.id,
          data: payload,
        })
        toast.success('Training updated successfully')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Training created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save training'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this training?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Training deleted successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete training'
      toast.error(errorMessage)
    }
  }

  const requiredForLabels: Record<TrainingRequiredFor, string> = {
    all_staff: 'All Staff',
    clinical: 'Clinical Staff',
    maintenance: 'Maintenance Staff',
  }

  const getRequiredForColor = (requiredFor: TrainingRequiredFor) => {
    switch (requiredFor) {
      case 'clinical':
        return 'bg-blue-100 text-blue-800'
      case 'maintenance':
        return 'bg-purple-100 text-purple-800'
      case 'all_staff':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const columns: ColumnDef<AssetComplianceTraining>[] = [
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
      accessorKey: 'trainingTitle',
      header: 'Training Title',
      cell: ({ row }) => <span className="font-medium">{row.original.trainingTitle}</span>,
    },
    {
      accessorKey: 'requiredFor',
      header: 'Required For',
      cell: ({ row }) => (
        <Badge className={getRequiredForColor(row.original.requiredFor)}>
          {requiredForLabels[row.original.requiredFor]}
        </Badge>
      ),
    },
    {
      accessorKey: 'validityPeriod',
      header: 'Validity Period',
      cell: ({ row }) => (row.original.validityPeriod ? `${row.original.validityPeriod} days` : '-'),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) =>
        row.original.notes ? row.original.notes.substring(0, 50) + (row.original.notes.length > 50 ? '...' : '') : '-',
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const training = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(training)}>
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(training.id)}>
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
            data={trainings}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search training..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Training
                </Button>
              </PermissionGuard>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTraining ? 'Edit Training' : 'Add Training'}</DialogTitle>
            <DialogDescription>
              {editingTraining ? 'Update the training details' : 'Add a new training requirement'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 p-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryId">
                Category <span className="text-red-500">*</span>
              </Label>
              {editingTraining ? (
                <Input value={editingTraining.asset?.item?.category?.name || ''} disabled className="bg-gray-50" />
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
              {editingTraining ? (
                <Input
                  value={editingTraining.asset ? getAssetOptionLabel(editingTraining.asset) : ''}
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
              <Label htmlFor="trainingTitle">
                Training Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="trainingTitle"
                value={formData.trainingTitle}
                onChange={(e) => setFormData({ ...formData, trainingTitle: e.target.value })}
                placeholder="e.g., Safe Operation Training"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="requiredFor">
                Required For <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.requiredFor}
                onValueChange={(value: TrainingRequiredFor) => setFormData({ ...formData, requiredFor: value })}
              >
                <SelectTrigger className="w-[100%]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="patient">Resident</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="validityPeriod">Validity Period (days)</Label>
              <Input
                id="validityPeriod"
                type="number"
                value={formData.validityPeriod}
                onChange={(e) => setFormData({ ...formData, validityPeriod: e.target.value })}
                placeholder="e.g., 365"
                min="1"
              />
              <p className="text-sm text-gray-500">Optional. How long the training certification is valid.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the training requirement..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingTraining ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Training
