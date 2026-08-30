import React, { useEffect, useRef, useState } from 'react'
import { Edit, FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGuard } from '@/components/common/PermissionGuard'
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
  useCreateAssetVendor,
  useDeleteAssetVendor,
  useGetAssetCategories,
  useGetAssetVendors,
  useUpdateAssetVendor,
} from '@/hooks/react-query/assetManagement'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { AssetVendor, CreateAssetVendorRequest } from '@/lib/types'

interface AssetVendorsProps {
  enabled?: boolean
}

const DocumentFilePreview: React.FC<{
  fieldId: string
  file: File
  previewUrlsRef: React.MutableRefObject<Map<string, string>>
  onChangeClick: () => void
}> = ({ fieldId, file, previewUrlsRef, onChangeClick }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const urlsMap = previewUrlsRef.current
    if (file.type.startsWith('image/')) {
      const prevUrl = urlsMap.get(fieldId)
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl)
      }
      const objectUrl = URL.createObjectURL(file)
      urlsMap.set(fieldId, objectUrl)
      setPreviewUrl(objectUrl)
    } else {
      setPreviewUrl(null)
    }

    return () => {
      const url = urlsMap.get(fieldId)
      if (url) {
        URL.revokeObjectURL(url)
        urlsMap.delete(fieldId)
      }
    }
  }, [fieldId, file, previewUrlsRef])

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">Selected file: {file.name}</p>
      {previewUrl && (
        <div className="mt-2">
          <img src={previewUrl} alt="Preview" className="max-w-full h-auto max-h-48 rounded border border-gray-300" />
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onChangeClick}>
        Change File
      </Button>
    </div>
  )
}

const ExistingDocumentDisplay: React.FC<{
  fieldId: string
  fieldValue: string
}> = ({ fieldId, fieldValue }) => {
  const isImage = fieldValue.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null
  const [imageError, setImageError] = useState(false)

  const handleChange = () => {
    const input = document.getElementById(`file-input-${fieldId}`) as HTMLInputElement
    if (input) {
      input.value = ''
      input.click()
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1">
        {isImage && !imageError ? (
          <img
            src={fieldValue}
            alt="Document preview"
            className="w-12 h-12 object-cover rounded border border-gray-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-12 h-12 bg-white border border-gray-300 rounded flex items-center justify-center">
            <FileText className="w-6 h-6 text-gray-500" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm text-gray-700 font-medium">Existing document</span>
          <a
            href={fieldValue}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
          >
            View Document
          </a>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleChange}>
        Change
      </Button>
    </div>
  )
}

const AssetVendors: React.FC<AssetVendorsProps> = ({ enabled = true }) => {
  const { selectedLocationId } = useLocationStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<AssetVendor | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    taxId: '',
  })
  const [customFields, setCustomFields] = useState<
    Array<{
      id: string
      fieldName: string
      fieldLabel: string
      fieldType: string
      fieldValue: string
      displayOrder: number
      isRequired: boolean
      defaultValue: string
      enumValues?: string[]
      file?: File | null
    }>
  >([])
  const previewUrlsRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    const urlsMap = previewUrlsRef.current
    return () => {
      urlsMap.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      urlsMap.clear()
    }
  }, [isModalOpen])

  const { data: vendorsData, isLoading } = useGetAssetVendors({
    search: searchTerm,
    limit: 1000,
    enabled,
  })

  const { data: categoriesData } = useGetAssetCategories({
    limit: 1000,
    enabled: isModalOpen,
  })

  const createMutation = useCreateAssetVendor()
  const updateMutation = useUpdateAssetVendor()
  const deleteMutation = useDeleteAssetVendor()

  const vendors = vendorsData?.data?.vendors || []
  const categories = categoriesData?.data?.categories || []

  const handleOpenModal = (vendor?: AssetVendor) => {
    if (vendor) {
      setEditingVendor(vendor)
      setFormData({
        name: vendor.name,
        categoryId: vendor.categoryId || '',
        contactPerson: vendor.contactPerson || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        website: vendor.website || '',
        taxId: vendor.taxId || '',
      })
      const existingFields = vendor.customFields || []
      if (Array.isArray(existingFields) && existingFields.length > 0) {
        setCustomFields(
          existingFields.map((field, index) => ({
            id: crypto.randomUUID?.() ?? String(Date.now() + index + Math.random()),
            fieldName: field.fieldName || '',
            fieldLabel: field.fieldLabel || field.fieldName || '',
            fieldType: field.fieldType || 'text',
            fieldValue: field.fieldValue || '',
            displayOrder: field.displayOrder ?? index,
            isRequired: field.isRequired ?? false,
            defaultValue: field.defaultValue || '',
            enumValues: field.enumValues || [],
            file: null,
          })),
        )
      } else {
        setCustomFields([])
      }
    } else {
      setEditingVendor(null)
      setFormData({
        name: '',
        categoryId: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        taxId: '',
      })
      setCustomFields([])
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingVendor(null)
    setCustomFields([])
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Vendor name is required')
      return
    }
    if (!formData.categoryId) {
      toast.error('Category is required')
      return
    }
    if (!formData.contactPerson.trim()) {
      toast.error('Contact person is required')
      return
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required')
      return
    }
    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      toast.error('Phone number must be a 10-digit number starting with 6, 7, 8, or 9')
      return
    }

    try {
      const validFields = customFields.filter((f) => f.fieldName && f.fieldLabel && f.fieldType)

      const hasDocumentFiles = validFields.some((f) => f.fieldType === 'document' && f.file)

      if (hasDocumentFiles) {
        const formDataPayload = new FormData()

        formDataPayload.append('name', formData.name)
        formDataPayload.append('categoryId', formData.categoryId)
        formDataPayload.append('contactPerson', formData.contactPerson)
        if (formData.email) {
          formDataPayload.append('email', formData.email)
        }
        formDataPayload.append('phone', formData.phone)
        if (formData.address) {
          formDataPayload.append('address', formData.address)
        }
        if (formData.website) {
          formDataPayload.append('website', formData.website)
        }
        if (formData.taxId) {
          formDataPayload.append('taxId', formData.taxId)
        }

        if (selectedLocationId) {
          formDataPayload.append('locationIds', JSON.stringify([selectedLocationId]))
        }

        if (validFields.length > 0) {
          const documentFields: File[] = []
          const customFieldsArray = validFields.map((f) => {
            const fieldObj: Record<string, unknown> = {
              fieldName: f.fieldName,
              fieldLabel: f.fieldLabel,
              fieldType: f.fieldType === 'boolean' ? 'bool' : f.fieldType,
              displayOrder: f.displayOrder,
              defaultValue: f.defaultValue || '',
            }

            if (f.fieldType === 'document') {
              if (f.file) {
                documentFields.push(f.file)
              } else if (f.fieldValue) {
                fieldObj.fieldValue = f.fieldValue
              }
            } else {
              fieldObj.fieldValue = f.fieldValue || f.defaultValue || ''
            }

            if (f.fieldType === 'select' && f.enumValues && f.enumValues.length > 0) {
              fieldObj.enumValues = f.enumValues
            }

            return fieldObj
          })

          formDataPayload.append('customFields', JSON.stringify(customFieldsArray))

          documentFields.forEach((file) => {
            formDataPayload.append('documents', file)
          })
        }

        if (editingVendor) {
          await updateMutation.mutateAsync({
            id: editingVendor.id,
            data: formDataPayload,
          })
          toast.success('Vendor updated successfully')
        } else {
          await createMutation.mutateAsync(formDataPayload)
          toast.success('Vendor created successfully')
        }
      } else {
        const payload: CreateAssetVendorRequest = {
          name: formData.name,
          categoryId: formData.categoryId,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
        }

        if (formData.email) payload.email = formData.email
        if (formData.address) payload.address = formData.address
        if (formData.website) payload.website = formData.website
        if (formData.taxId) payload.taxId = formData.taxId

        if (selectedLocationId) {
          payload.locationIds = [selectedLocationId]
        }

        if (validFields.length > 0) {
          payload.customFields = validFields.map((f) => ({
            fieldName: f.fieldName,
            fieldLabel: f.fieldLabel,
            fieldType: (f.fieldType === 'boolean' ? 'bool' : f.fieldType) as
              'number' | 'select' | 'text' | 'document' | 'date' | 'bool',
            fieldValue: f.fieldValue || f.defaultValue || '',
            displayOrder: f.displayOrder,
            isRequired: f.isRequired,
            defaultValue: f.defaultValue || '',
            enumValues: f.fieldType === 'select' && f.enumValues && f.enumValues.length > 0 ? f.enumValues : undefined,
          }))
        }

        if (editingVendor) {
          await updateMutation.mutateAsync({
            id: editingVendor.id,
            data: payload,
          })
          toast.success('Vendor updated successfully')
        } else {
          await createMutation.mutateAsync(payload)
          toast.success('Vendor created successfully')
        }
      }

      handleCloseModal()
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to save vendor')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Vendor deleted successfully')
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to delete vendor')
    }
  }

  const columns: ColumnDef<AssetVendor>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium truncate block max-w-[180px]">{row.original.name}</span>,
    },
    {
      accessorKey: 'contactPerson',
      header: 'Contact Person',
      cell: ({ row }) => <span className="truncate block max-w-[150px]">{row.original.contactPerson || '-'}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="truncate block max-w-[200px]">{row.original.email || '-'}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      accessorKey: 'website',
      header: 'Website',
      cell: ({ row }) =>
        row.original.website ? (
          <a
            href={row.original.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline truncate block max-w-[180px]"
            title={row.original.website}
          >
            {row.original.website}
          </a>
        ) : (
          '-'
        ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const vendor = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenModal(vendor)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Edit vendor"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(vendor.id)}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Delete vendor"
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
            data={vendors}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search vendors..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
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
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            <DialogDescription>
              {editingVendor ? 'Update vendor information' : 'Create a new asset vendor'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="name" className="mb-2">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vendor name"
                />
              </div>

              <div>
                <Label htmlFor="categoryId" className="mb-2">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value: string) => setFormData({ ...formData, categoryId: value })}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactPerson" className="mb-2">
                  Contact Person <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => {
                    const filteredValue = e.target.value.replace(/[^A-Za-z\s]/g, '')
                    setFormData({ ...formData, contactPerson: filteredValue })
                  }}
                  placeholder="Contact person name"
                />
              </div>

              <div>
                <Label htmlFor="email" className="mb-2">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="mb-2">
                Address
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="mb-2">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  maxLength={10}
                  onChange={(e) => {
                    let filteredValue = e.target.value.replace(/\D/g, '').slice(0, 10)
                    if (filteredValue.length > 0 && !/^[6-9]/.test(filteredValue)) {
                      filteredValue = filteredValue.replace(/^[^6-9]+/, '')
                    }
                    setFormData({ ...formData, phone: filteredValue })
                  }}
                  placeholder="9876543210"
                  title="10 digits starting with 6-9"
                />
              </div>

              <div>
                <Label htmlFor="website" className="mb-2">
                  Website
                </Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="taxId" className="mb-2">
                Tax ID
              </Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="GST/Tax ID"
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold text-gray-900">Custom Field Definitions</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Define additional fields for your vendor (e.g., payment terms, PAN, service region)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCustomFields((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
                        fieldName: '',
                        fieldLabel: '',
                        fieldType: 'text',
                        fieldValue: '',
                        displayOrder: prev.length,
                        isRequired: false,
                        defaultValue: '',
                        enumValues: [],
                      },
                    ])
                  }
                >
                  + Add Field
                </Button>
              </div>

              {customFields.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  No custom fields defined. Click &quot;Add Field&quot; to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {customFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg bg-white p-4 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Field {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setCustomFields((prev) => prev.filter((f) => f.id !== field.id))}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          ✕
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Field Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="e.g., paymentTerms"
                            value={field.fieldName}
                            onChange={(e) =>
                              setCustomFields((prev) =>
                                prev.map((f) =>
                                  f.id === field.id
                                    ? {
                                        ...f,
                                        fieldName: e.target.value.toLowerCase().replace(/\s+/g, ''),
                                      }
                                    : f,
                                ),
                              )
                            }
                            required
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Field Label <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="e.g., Payment Terms"
                            value={field.fieldLabel}
                            onChange={(e) =>
                              setCustomFields((prev) =>
                                prev.map((f) => (f.id === field.id ? { ...f, fieldLabel: e.target.value } : f)),
                              )
                            }
                            required
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Field Type <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={field.fieldType}
                            onValueChange={(val: string) =>
                              setCustomFields((prev) =>
                                prev.map((f) => (f.id === field.id ? { ...f, fieldType: val } : f)),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="bool">Boolean</SelectItem>
                              <SelectItem value="select">Dropdown</SelectItem>
                              <SelectItem value="document">Document</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Display Order</Label>
                          <Input
                            type="number"
                            value={field.displayOrder}
                            onChange={(e) =>
                              setCustomFields((prev) =>
                                prev.map((f) =>
                                  f.id === field.id
                                    ? {
                                        ...f,
                                        displayOrder: parseInt(e.target.value),
                                      }
                                    : f,
                                ),
                              )
                            }
                            className="text-sm"
                            min={0}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Field Value</Label>
                        {field.fieldType === 'document' ? (
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null
                                setCustomFields((prev) =>
                                  prev.map((f) =>
                                    f.id === field.id
                                      ? {
                                          ...f,
                                          file,
                                          fieldValue: file ? file.name : f.fieldValue || '',
                                        }
                                      : f,
                                  ),
                                )
                              }}
                              className="hidden"
                              id={`file-input-${field.id}`}
                            />

                            {field.file ? (
                              <DocumentFilePreview
                                fieldId={field.id}
                                file={field.file}
                                previewUrlsRef={previewUrlsRef}
                                onChangeClick={() => {
                                  const prevUrl = previewUrlsRef.current.get(field.id)
                                  if (prevUrl) {
                                    URL.revokeObjectURL(prevUrl)
                                    previewUrlsRef.current.delete(field.id)
                                  }
                                  const input = document.getElementById(`file-input-${field.id}`) as HTMLInputElement
                                  if (input) {
                                    input.value = ''
                                    input.click()
                                  }
                                }}
                              />
                            ) : field.fieldValue ? (
                              <ExistingDocumentDisplay fieldId={field.id} fieldValue={field.fieldValue} />
                            ) : (
                              <div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.getElementById(`file-input-${field.id}`) as HTMLInputElement
                                    if (input) {
                                      input.click()
                                    }
                                  }}
                                >
                                  Choose File
                                </Button>
                                <p className="text-xs text-gray-500 mt-1">No file chosen</p>
                              </div>
                            )}
                          </div>
                        ) : field.fieldType === 'select' ? (
                          <Select
                            value={field.fieldValue}
                            onValueChange={(val: string) =>
                              setCustomFields((prev) =>
                                prev.map((f) => (f.id === field.id ? { ...f, fieldValue: val } : f)),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={`Select ${field.fieldLabel}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.enumValues?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.fieldType === 'bool' ? (
                          <Select
                            value={field.fieldValue || 'false'}
                            onValueChange={(val: string) =>
                              setCustomFields((prev) =>
                                prev.map((f) => (f.id === field.id ? { ...f, fieldValue: val } : f)),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder={`Enter ${field.fieldLabel || 'value'}`}
                            value={field.fieldValue}
                            onChange={(e) =>
                              setCustomFields((prev) =>
                                prev.map((f) => (f.id === field.id ? { ...f, fieldValue: e.target.value } : f)),
                              )
                            }
                            className="text-sm"
                            type={
                              field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'
                            }
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingVendor ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AssetVendors
