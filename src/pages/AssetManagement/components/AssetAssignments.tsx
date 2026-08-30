import React, { useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
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
  useCreateAssetAssignment,
  useGetAssetAssignments,
  useGetAssetCategories,
  useGetAssets,
  useGetBedsForRoom,
  useGetEmployeesForAssignment,
  useGetPatientsForAssignment,
  useGetRoomsForAssignment,
  useReturnAsset,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { AssetAssignment, AssetCondition, AssigneeType, CreateAssetAssignmentRequest } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'

interface AssetAssignmentsProps {
  enabled?: boolean
}

const AssetAssignments: React.FC<AssetAssignmentsProps> = ({ enabled = true }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    assetId: '',
    assigneeType: 'employee' as AssigneeType,
    assigneeId: '',
    bedId: '',
    assignedAt: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    notes: '',
  })
  const [returnData, setReturnData] = useState<{
    returnCondition: AssetCondition
    notes: string
  }>({
    returnCondition: '' as AssetCondition,
    notes: '',
  })
  const debouncedSearch = useDebounce(searchTerm, 500)

  const { data: assignmentsData, isLoading } = useGetAssetAssignments({
    search: debouncedSearch,
    limit: 1000,
    enabled,
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

  const { data: employeesData } = useGetEmployeesForAssignment({
    enabled: isModalOpen && formData.assigneeType === 'employee',
  })
  const { data: patientsData } = useGetPatientsForAssignment({
    enabled: isModalOpen && formData.assigneeType === 'patient',
  })
  const { data: roomsData } = useGetRoomsForAssignment({
    enabled: isModalOpen && formData.assigneeType === 'room',
  })
  const { data: bedsData } = useGetBedsForRoom(formData.assigneeId, {
    enabled: isModalOpen && formData.assigneeType === 'room' && !!formData.assigneeId,
  })

  const createMutation = useCreateAssetAssignment()
  const returnMutation = useReturnAsset()

  const assignments = assignmentsData?.data?.assignments || []
  const categories = categoriesData?.data?.categories || []
  const availableAssets = assetsData?.data?.assets || []
  const employees = employeesData?.data || []
  const patients = patientsData?.data || []
  const rooms = roomsData?.data || []
  const beds = bedsData?.data || []

  const getAssetOptionLabel = (asset: (typeof availableAssets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = () => {
    setFormData({
      categoryId: '',
      assetId: '',
      assigneeType: 'employee',
      assigneeId: '',
      bedId: '',
      assignedAt: new Date().toISOString().split('T')[0],
      expectedReturnDate: '',
      notes: '',
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleOpenReturnModal = (assignmentId: string) => {
    setSelectedAssignment(assignmentId)
    setReturnData({
      returnCondition: '' as AssetCondition,
      notes: '',
    })
    setIsReturnModalOpen(true)
  }

  const handleCloseReturnModal = () => {
    setIsReturnModalOpen(false)
    setSelectedAssignment(null)
  }

  const handleSubmit = async () => {
    if (!formData.categoryId) {
      toast.error('Category is required')
      return
    }

    if (!formData.assetId || !formData.assigneeId) {
      toast.error('Asset and assignee are required')
      return
    }

    if (formData.expectedReturnDate && formData.expectedReturnDate <= formData.assignedAt) {
      toast.error('Expected Return Date must be after Assigned Date')
      return
    }

    try {
      const payload: CreateAssetAssignmentRequest = {
        assetId: formData.assetId,
        assigneeType: formData.assigneeType,
        assigneeId: formData.assigneeId,
        assignedAt: formData.assignedAt,
        notes: formData.notes,
      }

      if (formData.expectedReturnDate) {
        payload.expectedReturnDate = formData.expectedReturnDate
      }

      if (formData.assigneeType === 'room' && formData.bedId) {
        payload.bedId = formData.bedId
      }

      await createMutation.mutateAsync(payload)
      toast.success('Asset assigned successfully')
      handleCloseModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign asset'
      toast.error(errorMessage)
    }
  }

  const handleReturn = async () => {
    if (!selectedAssignment) return

    if (!returnData.returnCondition) {
      toast.error('Return condition is required')
      return
    }

    try {
      await returnMutation.mutateAsync({
        id: selectedAssignment,
        data: returnData,
      })
      toast.success('Asset returned successfully')
      handleCloseReturnModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to return asset'
      toast.error(errorMessage)
    }
  }

  const columns: ColumnDef<AssetAssignment>[] = [
    {
      accessorKey: 'asset',
      header: 'Asset',
      cell: ({ row }) => {
        const assignment = row.original
        return (
          <div>
            <p className="font-medium">{assignment.asset?.item?.name}</p>
            <p className="text-xs text-gray-500">
              {assignment.asset?.serialNumber || assignment.asset?.assetTag || '-'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'assignedTo',
      header: 'Assigned To',
      cell: ({ row }) => {
        const assignment = row.original
        if (assignment.assigneeType === 'room') {
          return (
            <div>
              {assignment.bed?.room ? (
                <>
                  <p className="font-medium">Room no: {assignment.bed.room.roomNumber}</p>
                  <p className="text-xs text-gray-500">Bed: {assignment.bed.bedNumber}</p>
                </>
              ) : assignment.room ? (
                <p className="font-medium">Room no: {assignment.room.roomNumber}</p>
              ) : assignment.assigneeDetails && 'roomNumber' in assignment.assigneeDetails ? (
                <p className="font-medium">Room no: {assignment.assigneeDetails.roomNumber}</p>
              ) : (
                <p className="text-sm text-gray-500">-</p>
              )}
            </div>
          )
        }
        if (assignment.assigneeDetails && 'name' in assignment.assigneeDetails) {
          return (
            <div>
              <p className="font-medium">{assignment.assigneeDetails.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {assignment.assigneeType}
                {'role' in assignment.assigneeDetails &&
                  assignment.assigneeDetails.role &&
                  ` (${assignment.assigneeDetails.role})`}
                {'patientNumber' in assignment.assigneeDetails &&
                  assignment.assigneeDetails.patientNumber &&
                  ` (${assignment.assigneeDetails.patientNumber})`}
              </p>
            </div>
          )
        }
        return <p className="text-sm text-gray-500">-</p>
      },
    },
    {
      accessorKey: 'assignedAt',
      header: 'Assigned At',
      cell: ({ row }) => formatDisplayDate(row.original.assignedAt),
    },
    {
      accessorKey: 'expectedReturnDate',
      header: 'Expected Return',
      cell: ({ row }) => formatDisplayDate(row.original.expectedReturnDate),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.returnedAt ? (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">Returned</Badge>
        ) : (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>
        ),
    },
    {
      accessorKey: 'returnedAt',
      header: 'Returned On',
      cell: ({ row }) => (row.original.returnedAt ? formatDisplayDate(row.original.returnedAt) : '-'),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const assignment = row.original
        return (
          <div className="text-right">
            {!assignment.returnedAt && (
              <PermissionGuard permission="assets:update">
                <Button variant="ghost" size="sm" onClick={() => handleOpenReturnModal(assignment.id)}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Return
                </Button>
              </PermissionGuard>
            )}
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
            data={assignments}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search assignments..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={handleOpenModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Asset
                </Button>
              </PermissionGuard>
            }
          />
        </CardContent>
      </Card>

      {/* Create Assignment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>Assign an asset to an employee, patient, or room</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
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
            </div>

            <div>
              <Label htmlFor="assetId" className="mb-2">
                Asset <span className="text-red-500">*</span>
              </Label>
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
                  {availableAssets.length === 0 ? (
                    <SelectItem value="__no_assets__" disabled>
                      No Asset Found
                    </SelectItem>
                  ) : (
                    availableAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {getAssetOptionLabel(asset)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assigneeType" className="mb-2">
                  Assignee Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.assigneeType}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      assigneeType: value as AssigneeType,
                      assigneeId: '',
                      bedId: '',
                    })
                  }
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="patient">Resident</SelectItem>
                    <SelectItem value="room">Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assigneeId" className="mb-2">
                  {formData.assigneeType === 'employee'
                    ? 'Employee'
                    : formData.assigneeType === 'patient'
                      ? 'Patient'
                      : 'Room'}{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.assigneeId}
                  onValueChange={(value: string) => setFormData({ ...formData, assigneeId: value, bedId: '' })}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder={`Select ${formData.assigneeType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.assigneeType === 'employee' &&
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </SelectItem>
                      ))}
                    {formData.assigneeType === 'patient' &&
                      patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                          {patient.patientNumber && ` (${patient.patientNumber})`}
                        </SelectItem>
                      ))}
                    {formData.assigneeType === 'room' &&
                      rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} - {room.status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.assigneeType === 'room' && formData.assigneeId && (
              <div>
                <Label htmlFor="bedId" className="mb-2">
                  Bed (optional)
                </Label>
                <p className="text-sm text-gray-500 mb-2">
                  Leave empty to assign to the entire room, or select a specific bed
                </p>
                <Select
                  value={formData.bedId}
                  onValueChange={(value: string) => setFormData({ ...formData, bedId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bed (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {beds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {bed.name} - {bed.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedAt" className="mb-2">
                  Assigned Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="assignedAt"
                  type="date"
                  value={formData.assignedAt}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextAssignedAt = e.target.value
                      const shouldResetReturnDate = prev.expectedReturnDate && prev.expectedReturnDate <= nextAssignedAt

                      return {
                        ...prev,
                        assignedAt: nextAssignedAt,
                        expectedReturnDate: shouldResetReturnDate ? '' : prev.expectedReturnDate,
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="expectedReturnDate" className="mb-2">
                  Expected Return Date
                </Label>
                <Input
                  id="expectedReturnDate"
                  type="date"
                  value={formData.expectedReturnDate}
                  min={
                    formData.assignedAt
                      ? new Date(new Date(formData.assignedAt).getTime() + 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      : undefined
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expectedReturnDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="mb-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Assignment notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Asset Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Return Asset</DialogTitle>
            <DialogDescription>Record the return of this asset</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="returnCondition" className="mb-2">
                Return Condition <span className="text-red-500">*</span>
              </Label>
              <Select
                value={returnData.returnCondition}
                onValueChange={(value: string) =>
                  setReturnData({
                    ...returnData,
                    returnCondition: value as AssetCondition,
                  })
                }
              >
                <SelectTrigger className="w-[100%]">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="returnNotes" className="mb-2">
                Notes
              </Label>
              <Textarea
                id="returnNotes"
                value={returnData.notes}
                onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                placeholder="Return notes, damage description, etc..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseReturnModal}>
              Cancel
            </Button>
            <Button onClick={handleReturn} disabled={returnMutation.isPending}>
              Return Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AssetAssignments
