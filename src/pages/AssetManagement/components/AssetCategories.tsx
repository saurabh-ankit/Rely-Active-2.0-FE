import React, { useState } from 'react'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateAssetCategory,
  useDeleteAssetCategory,
  useGetAssetCategories,
  useUpdateAssetCategory,
} from '@/hooks/react-query/assetManagement'
import type { AssetCategory } from '@/lib/types'

interface AssetCategoriesProps {
  enabled?: boolean
}

const AssetCategories: React.FC<AssetCategoriesProps> = ({ enabled = true }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const { data: categoriesData, isLoading } = useGetAssetCategories({
    search: searchTerm,
    limit: 1000,
    enabled,
  })

  const createMutation = useCreateAssetCategory()
  const updateMutation = useUpdateAssetCategory()
  const deleteMutation = useDeleteAssetCategory()

  const categories = categoriesData?.data?.categories || []

  const handleOpenModal = (category?: AssetCategory) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        description: category.description || '',
      })
    } else {
      setEditingCategory(null)
      setFormData({ name: '', description: '' })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData({ name: '', description: '' })
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          data: formData,
        })
        toast.success('Category updated successfully')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Category created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to save category')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Category deleted successfully')
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to delete category')
    }
  }

  const columns: ColumnDef<AssetCategory>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <span className="text-gray-600 dark:text-gray-400">{row.original.description || '-'}</span>,
    },
    {
      accessorKey: 'vendorCount',
      header: 'Vendors',
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium">
            {row.original.vendorCount || 0}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'itemCount',
      header: 'Items',
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-md bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-medium">
            {row.original.itemCount || 0}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const category = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(category)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Edit category"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(category.id)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Delete category"
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
            data={categories}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search categories..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </PermissionGuard>
            }
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category information' : 'Create a new asset category'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="name" className="mb-2">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Medical Equipment"
              />
            </div>

            <div>
              <Label htmlFor="description" className="mb-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Category description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AssetCategories
