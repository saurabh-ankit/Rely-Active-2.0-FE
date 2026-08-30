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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateAssetItem,
  useDeleteAssetItem,
  useGetAssetCategories,
  useGetAssetItems,
  useGetAssetVendorsDropdown,
  useUpdateAssetItem,
} from '@/hooks/react-query/assetManagement'
import type { AssetItem } from '@/lib/types'

interface AssetItemsProps {
  enabled?: boolean
}

const AssetItems: React.FC<AssetItemsProps> = ({ enabled = true }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    vendorId: '',
    model: '',
    manufacturer: '',
  })

  const { data: itemsData, isLoading } = useGetAssetItems({
    search: searchTerm,
    limit: 1000,
    enabled,
  })

  const { data: categoriesData } = useGetAssetCategories({
    limit: 100,
    enabled: isModalOpen,
  })

  const { data: vendorsData } = useGetAssetVendorsDropdown({
    categoryId: formData.categoryId,
    enabled: isModalOpen && !!formData.categoryId,
  })

  const createMutation = useCreateAssetItem()
  const updateMutation = useUpdateAssetItem()
  const deleteMutation = useDeleteAssetItem()

  const items = itemsData?.data?.items || []
  const categories = categoriesData?.data?.categories || []
  const vendors = vendorsData?.data || []

  const handleOpenModal = (item?: AssetItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        description: item.description || '',
        categoryId: item.categoryId,
        vendorId: item.vendorId || '',
        model: item.model || '',
        manufacturer: item.manufacturer || '',
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        description: '',
        categoryId: '',
        vendorId: '',
        model: '',
        manufacturer: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Item name is required')
      return
    }
    if (!formData.categoryId) {
      toast.error('Category is required')
      return
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: formData,
        })
        toast.success('Item updated successfully')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Item created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to save item')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Item deleted successfully')
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to delete item')
    }
  }

  const columns: ColumnDef<AssetItem>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category?.name || '-',
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => row.original.vendor?.name || '-',
    },
    {
      accessorKey: 'model',
      header: 'Model',
      cell: ({ row }) => row.original.model || '-',
    },
    {
      accessorKey: 'manufacturer',
      header: 'Manufacturer',
      cell: ({ row }) => row.original.manufacturer || '-',
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(item)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Edit item"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Delete item"
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
            data={items}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search items..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
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
            <DialogTitle>{editingItem ? 'Edit Asset Item' : 'Add Asset Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update asset item information' : 'Create a new asset item'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="mb-2">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Wheelchair"
                />
              </div>

              <div>
                <Label htmlFor="categoryId" className="mb-2">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      categoryId: value,
                      vendorId: '',
                    })
                  }
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="vendorId" className="mb-2">
                Vendor
              </Label>
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
            </div>

            <div>
              <Label htmlFor="description" className="mb-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Item description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="model" className="mb-2">
                  Model
                </Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Model number"
                />
              </div>

              <div>
                <Label htmlFor="manufacturer" className="mb-2">
                  Manufacturer
                </Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Manufacturer name"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AssetItems
