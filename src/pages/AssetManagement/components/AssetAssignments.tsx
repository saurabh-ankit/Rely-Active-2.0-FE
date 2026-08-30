import React, { useEffect, useState } from 'react'
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
  useGetEmployeesForAssignment,
  useGetResidentsForAssignment,
  useReturnAsset,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { AssetAssignment, AssetCondition, AssigneeType, CreateAssetAssignmentRequest, Property } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import { useLocationStore } from '@/lib/stores/locationStore'

interface AssetAssignmentsProps {
  enabled?: boolean
}

const AssetAssignments: React.FC<AssetAssignmentsProps> = ({ enabled = true }) => {
  const { selectedLocationId } = useLocationStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [propertyTree, setPropertyTree] = useState<Property | null>(null)

  const [formData, setFormData] = useState({
    categoryId: '',
    assetId: '',
    assigneeType: 'employee' as AssigneeType,
    assigneeId: '',
    blockId: '',
    floorId: '',
    unitId: '',
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
  const { data: residentsData } = useGetResidentsForAssignment({
    enabled: isModalOpen && formData.assigneeType === 'resident',
  })

  // Fetch property layout (blocks/floors/units) when assigneeType === 'flat'
  useEffect(() => {
    if (isModalOpen && formData.assigneeType === 'flat' && selectedLocationId && selectedLocationId !== 'all') {
      getPropertyByIdAPI(selectedLocationId)
        .then((prop) => setPropertyTree(prop))
        .catch(() => {})
    }
  }, [isModalOpen, formData.assigneeType, selectedLocationId])

  const createMutation = useCreateAssetAssignment()
  const returnMutation = useReturnAsset()

  const assignments = assignmentsData?.data?.assignments || []
  const categories = categoriesData?.data?.categories || []
  const availableAssets = assetsData?.data?.assets || []
  const employees = employeesData?.data || []
  const residents = residentsData?.data || []

  // Cascaded Block -> Floor -> Unit selections
  const blocks = (propertyTree?.blocks || []) as Array<{
    id: string
    block_name: string
    floors?: Array<{
      id: string
      floor_name?: string
      floor_number: number
      units?: Array<{
        id: string
        unit_number: string
        unit_type?: string
      }>
    }>
  }>

  const selectedBlock = blocks.find((b) => b.id === formData.blockId)
  const floors = selectedBlock?.floors || []
  const selectedFloor = floors.find((f) => f.id === formData.floorId)
  const units = selectedFloor?.units || []

  const getAssetOptionLabel = (asset: (typeof availableAssets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = () => {
    setFormData({
      categoryId: '',
      assetId: '',
      assigneeType: 'employee',
      assigneeId: '',
      blockId: '',
      floorId: '',
      unitId: '',
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
        const details = assignment.assigneeDetails as Record<string, unknown> | undefined

        if (details && details.name) {
          return (
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{String(details.name)}</p>
              <p className="text-xs text-gray-500 capitalize">
                <span className="font-semibold text-[#005390] dark:text-blue-400">{assignment.assigneeType}</span>
                {details.role && ` • ${String(details.role)}`}
                {details.residentType && ` • ${String(details.residentType)}`}
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
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <Input
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />

          <PermissionGuard permission="assets:create">
            <Button onClick={handleOpenModal}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Asset
            </Button>
          </PermissionGuard>
        </div>

        <DataTable columns={columns} data={assignments} isLoading={isLoading} />

        {/* Assign Asset Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-3xl md:max-w-4xl w-full p-6 sm:p-8 rounded-2xl shadow-xl">
            <DialogHeader className="pb-2 border-b border-gray-100 dark:border-gray-800">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Assign Asset</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Assign an asset to an employee, resident, or flat
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              {/* Category & Asset Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoryId" className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-200">
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
                    <SelectTrigger className="w-full h-10 text-xs rounded-xl">
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
                  <Label htmlFor="assetId" className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-200">
                    Asset <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.assetId}
                    onValueChange={(value: string) => setFormData({ ...formData, assetId: value })}
                    disabled={!formData.categoryId}
                  >
                    <SelectTrigger className="w-full h-10 text-xs rounded-xl">
                      <SelectValue
                        placeholder={
                          formData.categoryId ? 'Item name - serial number - asset tag' : 'Select category first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-w-[500px]">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="assigneeType"
                    className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-200"
                  >
                    Assignee Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.assigneeType}
                    onValueChange={(value: string) =>
                      setFormData({
                        ...formData,
                        assigneeType: value as AssigneeType,
                        assigneeId: '',
                        blockId: '',
                        floorId: '',
                        unitId: '',
                      })
                    }
                  >
                    <SelectTrigger className="w-full h-10 text-xs rounded-xl">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="resident">Resident</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.assigneeType === 'flat' ? (
                  <div className="col-span-1 md:col-span-2 space-y-3 p-4 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <Label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      Property Flat / Unit Hierarchy <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Select Block */}
                      <div>
                        <Label
                          htmlFor="blockId"
                          className="mb-1.5 block text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                        >
                          Block <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.blockId}
                          onValueChange={(val: string) =>
                            setFormData({
                              ...formData,
                              blockId: val,
                              floorId: '',
                              unitId: '',
                              assigneeId: '',
                            })
                          }
                        >
                          <SelectTrigger className="w-full h-9 text-xs rounded-lg">
                            <SelectValue placeholder="Select Block" />
                          </SelectTrigger>
                          <SelectContent>
                            {blocks.length === 0 ? (
                              <SelectItem value="__no_blocks__" disabled>
                                No Blocks Found
                              </SelectItem>
                            ) : (
                              blocks.map((block) => (
                                <SelectItem key={block.id} value={block.id}>
                                  {block.block_name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Select Floor */}
                      <div>
                        <Label
                          htmlFor="floorId"
                          className="mb-1.5 block text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                        >
                          Floor <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.floorId}
                          disabled={!formData.blockId}
                          onValueChange={(val: string) =>
                            setFormData({
                              ...formData,
                              floorId: val,
                              unitId: '',
                              assigneeId: '',
                            })
                          }
                        >
                          <SelectTrigger className="w-full h-9 text-xs rounded-lg">
                            <SelectValue placeholder={formData.blockId ? 'Select Floor' : 'Select Block first'} />
                          </SelectTrigger>
                          <SelectContent>
                            {floors.length === 0 ? (
                              <SelectItem value="__no_floors__" disabled>
                                No Floors Found
                              </SelectItem>
                            ) : (
                              floors.map((floor) => (
                                <SelectItem key={floor.id} value={floor.id}>
                                  {floor.floor_name || (floor.floor_number ? `Floor ${floor.floor_number}` : 'Floor')}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Select Flat / Unit */}
                      <div>
                        <Label
                          htmlFor="unitId"
                          className="mb-1.5 block text-[11px] font-semibold text-gray-600 dark:text-gray-400"
                        >
                          Flat / Unit <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.unitId}
                          disabled={!formData.floorId}
                          onValueChange={(val: string) =>
                            setFormData({
                              ...formData,
                              unitId: val,
                              assigneeId: val,
                            })
                          }
                        >
                          <SelectTrigger className="w-full h-9 text-xs rounded-lg">
                            <SelectValue placeholder={formData.floorId ? 'Select Flat' : 'Select Floor first'} />
                          </SelectTrigger>
                          <SelectContent>
                            {units.length === 0 ? (
                              <SelectItem value="__no_units__" disabled>
                                No Units Found
                              </SelectItem>
                            ) : (
                              units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  Unit {unit.unit_number} {unit.unit_type ? `(${unit.unit_type})` : ''}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label
                      htmlFor="assigneeId"
                      className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-200"
                    >
                      {formData.assigneeType === 'employee' ? 'Employee' : 'Resident'}{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.assigneeId}
                      onValueChange={(value: string) => setFormData({ ...formData, assigneeId: value })}
                    >
                      <SelectTrigger className="w-full h-10 text-xs rounded-xl">
                        <SelectValue placeholder={`Select ${formData.assigneeType}`} />
                      </SelectTrigger>
                      <SelectContent className="max-w-[550px]">
                        {formData.assigneeType === 'employee' &&
                          employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} {emp.role ? `(${emp.role})` : ''}
                            </SelectItem>
                          ))}
                        {formData.assigneeType === 'resident' &&
                          residents.map((resident) => (
                            <SelectItem key={resident.id} value={resident.id}>
                              {resident.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

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
                        const shouldResetReturnDate =
                          prev.expectedReturnDate && prev.expectedReturnDate <= nextAssignedAt

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
                        ? new Date(new Date(formData.assignedAt).getTime() + 86400000).toISOString().split('T')[0]
                        : undefined
                    }
                    onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="mb-2">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Assignment notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return Asset Modal */}
        <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return Asset</DialogTitle>
              <DialogDescription>Mark asset as returned and record condition</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="returnCondition" className="mb-2">
                  Return Condition <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={returnData.returnCondition}
                  onValueChange={(value: AssetCondition) => setReturnData({ ...returnData, returnCondition: value })}
                >
                  <SelectTrigger>
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
                  Return Notes
                </Label>
                <Textarea
                  id="returnNotes"
                  placeholder="Condition notes..."
                  value={returnData.notes}
                  onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseReturnModal}>
                Cancel
              </Button>
              <Button onClick={handleReturn} disabled={returnMutation.isPending}>
                {returnMutation.isPending ? 'Returning...' : 'Return Asset'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default AssetAssignments
