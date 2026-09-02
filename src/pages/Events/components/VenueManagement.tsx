import { Button } from '@/components/ui/button'
import PaginatedDataTable from '@/components/ui/paginated-data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import { useCreateVenue, useDeleteVenue, useListVenues, useUpdateVenue } from '@/hooks/react-query/events'
import type { AddOnService, CreateVenueRequest, Venue } from '@/lib/services/eventService'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { parseJsonArray } from '@/lib/utils/jsonUtils'
import { Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'

interface VenueManagementProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VenueManagement: React.FC<VenueManagementProps> = ({ open, onOpenChange }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchTerm, setSearchTerm] = useState('')

  const [venueForm, setVenueForm] = useState<Partial<CreateVenueRequest>>({
    name: '',
    occupancy: 0,
    keyFeatures: '',
    otherServices: '',
    coverPhoto: '',
    images: [],
    addOnServices: [],
  })
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([])
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([])

  const { data: venuesData } = useListVenues({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: searchTerm || undefined,
  })
  const createVenueMutation = useCreateVenue()
  const updateVenueMutation = useUpdateVenue()
  const deleteVenueMutation = useDeleteVenue()

  // Ensure venues is always an array - handle different API response structures
  const venues = Array.isArray(venuesData?.data?.venues)
    ? venuesData.data.venues
    : Array.isArray(venuesData?.data?.records)
      ? venuesData.data.records
      : Array.isArray(venuesData?.data)
        ? venuesData.data
        : []
  const paginationInfo = venuesData?.data?.pagination

  const handleCreateVenue = () => {
    if (!venueForm.name || !venueForm.occupancy) return

    const formData = new FormData()
    formData.append('name', venueForm.name)
    formData.append('occupancy', venueForm.occupancy.toString())
    if (venueForm.keyFeatures) {
      formData.append('keyFeatures', venueForm.keyFeatures)
    }
    if (venueForm.otherServices) {
      formData.append('otherServices', venueForm.otherServices)
    }

    // Append cover photo file if provided
    if (coverPhotoFile) {
      formData.append('coverPhoto', coverPhotoFile)
    }

    // Append image files
    imageFiles.forEach((file) => {
      if (file) {
        formData.append('images', file)
      }
    })

    // Append image captions as JSON array
    if (venueForm.images && venueForm.images.length > 0) {
      const captions = venueForm.images.map((img) => ({
        caption: img.caption || '',
      }))
      formData.append('images', JSON.stringify(captions))
    }

    // Handle add-on services
    if (venueForm.addOnServices && venueForm.addOnServices.length > 0) {
      formData.append('addOnServices', JSON.stringify(venueForm.addOnServices))
    }

    createVenueMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateOpen(false)
        resetForm()
      },
    })
  }

  const handleUpdateVenue = () => {
    if (!selectedVenue || !venueForm.name) return

    const formData = new FormData()
    formData.append('name', venueForm.name)
    if (venueForm.occupancy !== undefined) {
      formData.append('occupancy', venueForm.occupancy.toString())
    }
    if (venueForm.keyFeatures) {
      formData.append('keyFeatures', venueForm.keyFeatures)
    }
    if (venueForm.otherServices) {
      formData.append('otherServices', venueForm.otherServices)
    }

    // Append cover photo file if provided
    if (coverPhotoFile) {
      formData.append('coverPhoto', coverPhotoFile)
    }

    // Append image files
    imageFiles.forEach((file) => {
      if (file) {
        formData.append('images', file)
      }
    })

    // Append image captions as JSON array
    if (venueForm.images && venueForm.images.length > 0) {
      const captions = venueForm.images.map((img) => ({
        caption: img.caption || '',
      }))
      formData.append('images', JSON.stringify(captions))
    }

    // Handle add-on services
    if (venueForm.addOnServices && venueForm.addOnServices.length > 0) {
      formData.append('addOnServices', JSON.stringify(venueForm.addOnServices))
    }

    updateVenueMutation.mutate(
      { venueId: selectedVenue.id, data: formData },
      {
        onSuccess: () => {
          setIsEditOpen(false)
          setSelectedVenue(null)
          resetForm()
        },
      },
    )
  }

  const handleDeleteVenue = (venueId: string) => {
    if (confirm('Are you sure you want to delete this venue?')) {
      deleteVenueMutation.mutate(venueId)
    }
  }

  const resetForm = () => {
    setVenueForm({
      name: '',
      occupancy: 0,
      keyFeatures: '',
      otherServices: '',
      coverPhoto: '',
      images: [],
      addOnServices: [],
    })
    setCoverPhotoFile(null)
    setCoverPhotoPreview(null)
    setImageFiles([])
    setImagePreviews([])
  }

  const openEditDialog = (venue: Venue) => {
    setSelectedVenue(venue)
    const images = parseJsonArray<{ url: string; caption?: string }>(venue.images)
    setVenueForm({
      name: venue.name,
      occupancy: venue.occupancy,
      keyFeatures: venue.keyFeatures,
      otherServices: venue.otherServices,
      coverPhoto: venue.coverPhoto,
      images: images,
      addOnServices: parseJsonArray<AddOnService>(venue.addOnServices),
    })
    setCoverPhotoFile(null)
    setCoverPhotoPreview(null)
    setImageFiles(new Array(images.length).fill(null))
    setImagePreviews(new Array(images.length).fill(null))
    setIsEditOpen(true)
  }

  const addImage = () => {
    setVenueForm({
      ...venueForm,
      images: [...(venueForm.images || []), { url: '', caption: '' }],
    })
    setImageFiles([...imageFiles, null])
    setImagePreviews([...imagePreviews, null])
  }

  const removeImage = (index: number) => {
    const newImages = [...(venueForm.images || [])]
    newImages.splice(index, 1)
    setVenueForm({ ...venueForm, images: newImages })
    const newFiles = [...imageFiles]
    newFiles.splice(index, 1)
    setImageFiles(newFiles)
    const newPreviews = [...imagePreviews]
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  const updateImage = (index: number, field: 'url' | 'caption', value: string) => {
    const newImages = [...(venueForm.images || [])]
    newImages[index] = { ...newImages[index], [field]: value }
    setVenueForm({ ...venueForm, images: newImages })
  }

  const addAddOnService = () => {
    setVenueForm({
      ...venueForm,
      addOnServices: [...(venueForm.addOnServices || []), { name: '' }],
    })
  }

  const removeAddOnService = (index: number) => {
    const newServices = [...(venueForm.addOnServices || [])]
    newServices.splice(index, 1)
    setVenueForm({ ...venueForm, addOnServices: newServices })
  }

  const updateAddOnService = (index: number, field: keyof AddOnService, value: string) => {
    const newServices = [...(venueForm.addOnServices || [])]
    newServices[index] = { ...newServices[index], [field]: value }
    setVenueForm({ ...venueForm, addOnServices: newServices })
  }

  const columns: ColumnDef<Venue>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'occupancy',
      header: 'Occupancy',
    },
    {
      accessorKey: 'keyFeatures',
      header: 'Key Features',
      cell: ({ row }) => {
        const features = row.getValue('keyFeatures') as string
        return <div className="max-w-xs truncate">{features || '-'}</div>
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <EventsPermission action="update">
            <Button variant="outline" size="sm" onClick={() => openEditDialog(row.original)}>
              Edit
            </Button>
          </EventsPermission>
          <EventsPermission action="delete">
            <Button variant="destructive" size="sm" onClick={() => handleDeleteVenue(row.original.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </EventsPermission>
        </div>
      ),
    },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:!max-w-[600px] md:!max-w-[700px] lg:!max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>{/* <DialogTitle>Venue Management</DialogTitle> */}</DialogHeader>
          <div className="space-y-4 p-3">
            <div className="flex  flex-col sm:flex-row justify-between items-center">
              <Input
                placeholder="Search venues..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPagination({ ...pagination, pageIndex: 0 })
                }}
                className="max-w-xs"
              />
              <EventsPermission action="create">
                <Button
                  onClick={() => {
                    resetForm()
                    setIsCreateOpen(true)
                  }}
                  className="border-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Venue
                </Button>
              </EventsPermission>
            </div>

            <PaginatedDataTable
              columns={columns}
              paginatedData={{
                pageSize: pagination.pageSize,
                pageIndex: pagination.pageIndex,
                totalRecords: paginationInfo?.totalCount || venues.length,
                data: venues,
              }}
              pagination={pagination}
              setPagination={setPagination}
              sorting={[]}
              setSorting={() => {}}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Venue Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Venue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-3">
            <div>
              <Label className="mb-1.5">Name *</Label>
              <Input
                value={venueForm.name}
                onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                placeholder="Venue name"
              />
            </div>

            <div>
              <Label className="mb-1.5">Occupancy *</Label>
              <Input
                type="number"
                value={venueForm.occupancy}
                onChange={(e) =>
                  setVenueForm({
                    ...venueForm,
                    occupancy: parseInt(e.target.value),
                  })
                }
                placeholder="Maximum occupancy"
              />
            </div>

            <div>
              <Label className="mb-1.5">Key Features</Label>
              <Textarea
                value={venueForm.keyFeatures}
                onChange={(e) => setVenueForm({ ...venueForm, keyFeatures: e.target.value })}
                placeholder="Stage, Projector, Sound system"
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-1.5">Other Services</Label>
              <Textarea
                value={venueForm.otherServices}
                onChange={(e) => setVenueForm({ ...venueForm, otherServices: e.target.value })}
                placeholder="On-site catering available"
                rows={2}
              />
            </div>

            <div>
              <Label className="mb-1.5">Cover Photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setCoverPhotoFile(file)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setCoverPhotoPreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
              {coverPhotoPreview && (
                <div className="mt-2">
                  <img
                    src={coverPhotoPreview}
                    alt="Cover preview"
                    className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Images</Label>
                <Button type="button" variant="outline" size="sm" onClick={addImage}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Image
                </Button>
              </div>
              {venueForm.images?.map((image, index) => (
                <div key={index} className="space-y-2 mb-4 p-3 border rounded">
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const newFiles = [...imageFiles]
                          newFiles[index] = file
                          setImageFiles(newFiles)
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            const newPreviews = [...imagePreviews]
                            newPreviews[index] = reader.result as string
                            setImagePreviews(newPreviews)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeImage(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={image.caption || ''}
                    onChange={(e) => updateImage(index, 'caption', e.target.value)}
                    placeholder="Caption (optional)"
                  />
                  {imagePreviews[index] && (
                    <div className="mt-2">
                      <img
                        src={imagePreviews[index]!}
                        alt={`Preview ${index + 1}`}
                        className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Add-On Services</Label>
                <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={addAddOnService}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              </div>
              {venueForm.addOnServices?.map((service, index) => (
                <div key={index} className="space-y-2 mb-2 p-2 border rounded">
                  <div className="flex gap-2">
                    <Input
                      value={service.name}
                      onChange={(e) => updateAddOnService(index, 'name', e.target.value)}
                      placeholder="Service name"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => removeAddOnService(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={service.imageUrl || ''}
                    onChange={(e) => updateAddOnService(index, 'imageUrl', e.target.value)}
                    placeholder="Image URL (optional)"
                  />
                  <Input
                    value={service.keyFeatures || ''}
                    onChange={(e) => updateAddOnService(index, 'keyFeatures', e.target.value)}
                    placeholder="Key features (optional)"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                onClick={handleCreateVenue}
                disabled={createVenueMutation.isPending}
                className="border-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white cursor-pointer"
              >
                Create Venue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Venue Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div>
              <Label className="mb-1.5">Name *</Label>
              <Input
                value={venueForm.name}
                onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                placeholder="Venue name"
              />
            </div>

            <div>
              <Label className="mb-1.5">Occupancy *</Label>
              <Input
                type="number"
                value={venueForm.occupancy}
                onChange={(e) =>
                  setVenueForm({
                    ...venueForm,
                    occupancy: parseInt(e.target.value),
                  })
                }
                placeholder="Maximum occupancy"
              />
            </div>

            <div>
              <Label className="mb-1.5">Key Features</Label>
              <Textarea
                value={venueForm.keyFeatures}
                onChange={(e) => setVenueForm({ ...venueForm, keyFeatures: e.target.value })}
                placeholder="Stage, Projector, Sound system"
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-1.5">Other Services</Label>
              <Textarea
                value={venueForm.otherServices}
                onChange={(e) => setVenueForm({ ...venueForm, otherServices: e.target.value })}
                placeholder="On-site catering available"
                rows={2}
              />
            </div>

            <div>
              <Label className="mb-1.5">Cover Photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setCoverPhotoFile(file)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setCoverPhotoPreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
              {coverPhotoPreview && (
                <div className="mt-2">
                  <img
                    src={coverPhotoPreview}
                    alt="Cover preview"
                    className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <p className="text-sm text-gray-500 mt-1">New cover photo (will replace current)</p>
                </div>
              )}
              {!coverPhotoPreview && venueForm.coverPhoto && (
                <div className="mt-2">
                  <img
                    src={venueForm.coverPhoto}
                    alt="Current cover"
                    className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <p className="text-sm text-gray-500 mt-1">Current cover photo</p>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="mb-1.5">Images</Label>
                <Button type="button" variant="outline" size="sm" onClick={addImage}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Image
                </Button>
              </div>
              {venueForm.images?.map((image, index) => (
                <div key={index} className="space-y-2 mb-4 p-3 border rounded">
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const newFiles = [...imageFiles]
                          newFiles[index] = file
                          setImageFiles(newFiles)
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            const newPreviews = [...imagePreviews]
                            newPreviews[index] = reader.result as string
                            setImagePreviews(newPreviews)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeImage(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={image.caption || ''}
                    onChange={(e) => updateImage(index, 'caption', e.target.value)}
                    placeholder="Caption (optional)"
                  />
                  {(imagePreviews[index] || image.url) && (
                    <div className="mt-2">
                      <img
                        src={imagePreviews[index] || image.url}
                        alt={`Preview ${index + 1}`}
                        className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="mb-1.5">Add-On Services</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAddOnService}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              </div>
              {venueForm.addOnServices?.map((service, index) => (
                <div key={index} className="space-y-2 mb-2 p-2 border rounded">
                  <div className="flex gap-2">
                    <Input
                      value={service.name}
                      onChange={(e) => updateAddOnService(index, 'name', e.target.value)}
                      placeholder="Service name"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAddOnService(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={service.imageUrl || ''}
                    onChange={(e) => updateAddOnService(index, 'imageUrl', e.target.value)}
                    placeholder="Image URL (optional)"
                  />
                  <Input
                    value={service.keyFeatures || ''}
                    onChange={(e) => updateAddOnService(index, 'keyFeatures', e.target.value)}
                    placeholder="Key features (optional)"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedVenue) {
                    handleDeleteVenue(selectedVenue.id)
                  }
                }}
                disabled={deleteVenueMutation.isPending}
                className="cursor-pointer"
              >
                Delete
              </Button>
              <Button
                onClick={handleUpdateVenue}
                disabled={updateVenueMutation.isPending}
                className="border-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white cursor-pointer"
              >
                Update Venue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default VenueManagement
