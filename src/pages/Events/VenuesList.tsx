import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PaginatedDataTable from '@/components/ui/paginated-data-table'
import { Input } from '@/components/ui/input'
import { useListVenues, useUpdateVenue, useDeleteVenue } from '@/hooks/react-query/events'
import { useLocationGlobalServices } from '@/hooks/react-query/globalServices'
import {
  getServiceTotalPrice,
  mapSelectedServicesToAddOns,
  resolveSelectedVenueServices,
} from '@/lib/services/globalServiceService'
import { notifyError } from '@/utils/toast'
import type { Venue, AddOnService, VenueImage } from '@/lib/services/eventService'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { ArrowLeft, Users, Plus } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldErrors } from 'react-hook-form'
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { parseJsonArray } from '@/lib/utils/jsonUtils'
import { createVenueFormSchema, venueFormDefaultValues, type VenueFormValues } from '@/validations/venueForm.validation'
import CreateVenueModal from './components/CreateVenueModal'
import { VenueFormFields } from './components/VenueFormFields'

interface VenuesListPageProps {
  embedded?: boolean
  enabled?: boolean
}

const VenuesListPage = ({ embedded = false, enabled = true }: VenuesListPageProps) => {
  const navigate = useNavigate()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchTerm, setSearchTerm] = useState('')

  const { data: venuesData } = useListVenues({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: searchTerm || undefined,
  })

  const updateVenueMutation = useUpdateVenue()
  const deleteVenueMutation = useDeleteVenue()
  const { data: locationServices = [], isLoading: isLoadingServices } = useLocationGlobalServices()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [editingAllocations, setEditingAllocations] = useState<Record<string, number>>({})

  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([])
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([])

  const editSchema = useMemo(
    () => createVenueFormSchema({ locationServices, editingAllocations }),
    [locationServices, editingAllocations],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VenueFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: venueFormDefaultValues,
    mode: 'onChange',
  })

  const onEditInvalid = (fieldErrors: FieldErrors<VenueFormValues>) => {
    const firstError = Object.values(fieldErrors)[0]
    const message =
      (firstError && 'message' in firstError ? firstError.message : undefined) || 'Please fix the form errors'
    notifyError(String(message))
  }

  const onEditSubmit = (values: VenueFormValues) => {
    if (!selectedVenue) return

    const formData = new FormData()
    formData.append('name', values.name)
    formData.append('occupancy', values.occupancy.toString())
    formData.append('price', String(values.price || 0))
    formData.append('keyFeatures', values.keyFeatures)

    if (coverPhotoFile) {
      formData.append('coverPhoto', coverPhotoFile)
    }

    imageFiles.forEach((file) => {
      if (file) {
        formData.append('images', file)
      }
    })

    if (values.images && values.images.length > 0) {
      const captions = values.images.map((img) => ({
        caption: img.caption || '',
      }))
      formData.append('images', JSON.stringify(captions))
    }

    const mappedServices = mapSelectedServicesToAddOns(locationServices, values.selectedServices || [])
    formData.append('addOnServices', JSON.stringify(mappedServices.length > 0 ? mappedServices : []))

    updateVenueMutation.mutate(
      { venueId: selectedVenue.id, data: formData as FormData },
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
      deleteVenueMutation.mutate(venueId, {
        onSuccess: () => {
          setIsEditOpen(false)
          setSelectedVenue(null)
          resetForm()
        },
      })
    }
  }

  const resetForm = () => {
    reset(venueFormDefaultValues)
    setCoverPhotoFile(null)
    setCoverPhotoPreview(null)
    setImageFiles([])
    setImagePreviews([])
    setEditingAllocations({})
  }

  const openEditDialog = (venue: Venue) => {
    setSelectedVenue(venue)
    const images = parseJsonArray<VenueImage>(venue.images)
    const addons = parseJsonArray<AddOnService>(venue.addOnServices)
    const selectedServices = resolveSelectedVenueServices(addons, locationServices)
    const allocations: Record<string, number> = {}
    for (const addon of addons) {
      if (addon.globalServiceId) {
        allocations[addon.globalServiceId] = addon.quantity ?? 1
      }
    }
    setEditingAllocations(allocations)
    reset({
      name: venue.name,
      occupancy: venue.occupancy,
      price: venue.price ?? 0,
      keyFeatures: venue.keyFeatures || '',
      otherServices: venue.otherServices || '',
      images,
      selectedServices,
    })
    setCoverPhotoFile(null)
    setCoverPhotoPreview(null)
    setImageFiles(new Array(images.length).fill(null))
    setImagePreviews(new Array(images.length).fill(null))
    setIsEditOpen(true)
  }

  const addImage = () => {
    const images = watch('images') || []
    setValue('images', [...images, { url: '', caption: '' }])
    setImageFiles([...imageFiles, null])
    setImagePreviews([...imagePreviews, null])
  }

  const removeImage = (index: number) => {
    const images = [...(watch('images') || [])]
    images.splice(index, 1)
    setValue('images', images)
    const newFiles = [...imageFiles]
    newFiles.splice(index, 1)
    setImageFiles(newFiles)
    const newPreviews = [...imagePreviews]
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  // Ensure venues is always an array
  const venues = Array.isArray(venuesData?.data?.venues)
    ? venuesData.data.venues
    : Array.isArray(venuesData?.data?.records)
      ? venuesData.data.records
      : Array.isArray(venuesData?.data)
        ? venuesData.data
        : []
  const paginationInfo = venuesData?.data?.pagination

  const columns: ColumnDef<Venue>[] = [
    {
      accessorKey: 'coverPhoto',
      header: 'Cover Photo',
      cell: ({ row }) => {
        const coverPhoto = row.getValue('coverPhoto') as string
        return (
          <div className="w-32 h-20 rounded-lg overflow-hidden">
            {coverPhoto ? (
              <img
                src={coverPhoto}
                alt={row.original.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x120?text=No+Image'
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                No Image
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'name',
      header: 'Venue Name',
      cell: ({ row }) => {
        const venue = row.original
        return (
          <div>
            <div className="font-semibold text-gray-900">{venue.name}</div>
            {venue.keyFeatures && <div className="text-sm text-gray-500 mt-1">{venue.keyFeatures}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: 'occupancy',
      header: 'Occupancy',
      cell: ({ row }) => {
        const occupancy = row.getValue('occupancy') as number
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{occupancy} people</span>
          </div>
        )
      },
    },
    {
      id: 'cost',
      header: 'Cost',
      cell: ({ row }) => {
        const venuePrice = Number(row.original.price ?? 0)
        const services = parseJsonArray<AddOnService>(row.original.addOnServices)
        const servicesTotal = services.reduce(
          (sum, service) => sum + getServiceTotalPrice(service.price, service.quantity),
          0,
        )
        const cost = venuePrice + servicesTotal
        return (
          <span className="font-semibold text-gray-900 text-sm">
            ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      accessorKey: 'images',
      header: 'Images',
      cell: ({ row }) => {
        const images = parseJsonArray<VenueImage>(row.original.images)
        return (
          <div className="flex gap-2">
            {images.length > 0 ? (
              images.slice(0, 3).map((img, idx) => (
                <div key={idx} className="w-16 h-16 rounded overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.caption || `Image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Error'
                    }}
                  />
                </div>
              ))
            ) : (
              <span className="text-gray-400 text-sm">No images</span>
            )}
            {images.length > 3 && (
              <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                +{images.length - 3}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'addOnServices',
      header: 'Add-On Services',
      cell: ({ row }) => {
        const services = parseJsonArray<AddOnService>(row.original.addOnServices)
        return (
          <div className="flex flex-wrap gap-1">
            {services.length > 0 ? (
              services.slice(0, 2).map((service, idx) => (
                <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  {service.name}
                  {(service.quantity ?? 1) > 1 ? ` ×${service.quantity}` : ''}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-sm">None</span>
            )}
            {services.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">+{services.length - 2}</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => openEditDialog(row.original)}>
          View Details
        </Button>
      ),
    },
  ]

  if (!enabled) return null

  return (
    <div>
      {!embedded && (
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/events')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calendar
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Venues List</h1>
          <p className="text-gray-600 mt-2">View and manage all venues</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle>All Venues</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search venues..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPagination({ ...pagination, pageIndex: 0 })
                }}
                className="w-full sm:w-64"
              />
              <EventsPermission action="create">
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-[#2a517c] hover:bg-[#476587] text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Venue
                </Button>
              </EventsPermission>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PaginatedDataTable
            columns={columns}
            paginatedData={{
              pageSize: pagination.pageSize,
              pageIndex: pagination.pageIndex,
              totalRecords: paginationInfo?.total || venues.length,
              data: venues,
            }}
            pagination={pagination}
            setPagination={setPagination}
            sorting={[]}
            setSorting={() => {}}
          />
        </CardContent>
      </Card>

      <CreateVenueModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Edit Venue Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) {
            setSelectedVenue(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditSubmit, onEditInvalid)} noValidate className="space-y-4 p-4">
            <VenueFormFields
              register={register}
              control={control}
              errors={errors}
              watch={watch}
              setValue={setValue}
              locationServices={locationServices}
              isLoadingServices={isLoadingServices}
              editingAllocations={editingAllocations}
              coverPhotoFile={coverPhotoFile}
              coverPhotoPreview={coverPhotoPreview}
              existingCoverPhoto={selectedVenue?.coverPhoto}
              imagePreviews={imagePreviews}
              onCoverPhotoChange={(file, preview) => {
                setCoverPhotoFile(file)
                setCoverPhotoPreview(preview)
              }}
              onAddImage={addImage}
              onRemoveImage={removeImage}
              onImageFileChange={(index, file, preview) => {
                const newFiles = [...imageFiles]
                newFiles[index] = file
                setImageFiles(newFiles)
                const newPreviews = [...imagePreviews]
                newPreviews[index] = preview
                setImagePreviews(newPreviews)
              }}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <EventsPermission action="delete">
                <Button
                  type="button"
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
              </EventsPermission>
              <EventsPermission action="update">
                <Button
                  type="submit"
                  disabled={updateVenueMutation.isPending}
                  className="border-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white cursor-pointer"
                >
                  Update Venue
                </Button>
              </EventsPermission>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VenuesListPage
