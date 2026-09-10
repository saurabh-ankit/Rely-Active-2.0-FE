import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocationStore } from '@/lib/stores/locationStore'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import { useQuery } from '@tanstack/react-query'
import {
  residentPoolFormDefaultValues,
  residentPoolFormSchema,
  type ResidentPoolFormValues,
} from '@/utils/roster.utils'
import { RosterPermission } from '../RosterPermission'
import {
  useListEmployeeShifts,
  useListShiftEmployeeDates,
  useCreateResidentPool,
  useDeleteResidentPool,
  useListResidentPools,
} from '@/hooks/react-query/roster'

type OccupiedFlatOption = {
  id: string
  label: string
}

const isOccupiedStatus = (status?: string | null) => {
  const occ = (status || '').toString().toUpperCase()
  return occ === 'OWNER_OCCUPIED' || occ === 'TENANT_OCCUPIED'
}

const formatPoolUnitLabel = (unit?: {
  unit_number?: string
  floor?: { floor_name?: string | null; floor_number?: number; block?: { block_name?: string } }
}) => {
  if (!unit) return null
  const block = unit.floor?.block?.block_name
  const floor = unit.floor?.floor_name || (unit.floor?.floor_number != null ? `Floor ${unit.floor.floor_number}` : null)
  const unitNumber = unit.unit_number
  return [block, floor, unitNumber].filter(Boolean).join(' · ') || null
}

const ResidentAssignment = () => {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const locationId = useLocationStore((s) => s.selectedLocationId)

  const { data: assignmentsData } = useListEmployeeShifts(employeeId)
  const assignmentIds = useMemo(() => {
    const list = Array.isArray(assignmentsData?.data) ? assignmentsData.data : []
    return list.map((a) => a.id)
  }, [assignmentsData])

  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)

  const { data: datesData } = useListShiftEmployeeDates({ date: selectedDate }, !!employeeId)
  const shiftDates = useMemo(() => {
    const all = Array.isArray(datesData?.data) ? datesData.data : []
    return all.filter((d) => d.shiftAssignment?.employeeId === employeeId)
  }, [datesData, employeeId])

  const [selectedShiftDateId, setSelectedShiftDateId] = useState<string>('')
  const activeShiftDateId = selectedShiftDateId || shiftDates[0]?.id || ''

  const { data: poolsData, isLoading } = useListResidentPools(
    { shiftEmployeeDateId: activeShiftDateId },
    !!activeShiftDateId,
  )
  const pools = useMemo(() => (Array.isArray(poolsData?.data) ? poolsData.data : []), [poolsData])

  const { data: property } = useQuery({
    queryKey: ['property', locationId],
    queryFn: () => getPropertyByIdAPI(locationId!),
    enabled: !!locationId,
  })

  const occupiedFlats = useMemo(() => {
    const options: OccupiedFlatOption[] = []
    const blocks = (property?.blocks || []) as Array<{
      block_name?: string
      floors?: Array<{
        floor_name?: string | null
        floor_number?: number
        units?: Array<{
          id: string
          unit_number?: string
          occupancyStatus?: string
          occupancy_status?: string
        }>
      }>
    }>

    for (const block of blocks) {
      for (const floor of block.floors || []) {
        for (const unit of floor.units || []) {
          if (!unit.id || !unit.unit_number) continue
          if (!isOccupiedStatus(unit.occupancyStatus || unit.occupancy_status)) continue
          const floorLabel = floor.floor_name || (floor.floor_number != null ? `Floor ${floor.floor_number}` : null)
          const label = [block.block_name, floorLabel, unit.unit_number].filter(Boolean).join(' · ')
          options.push({ id: unit.id, label: label || unit.unit_number })
        }
      }
    }

    return options
  }, [property])

  const createPool = useCreateResidentPool()
  const deletePool = useDeleteResidentPool()

  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ResidentPoolFormValues>({
    resolver: zodResolver(residentPoolFormSchema),
    defaultValues: residentPoolFormDefaultValues,
    mode: 'onChange',
  })

  const unitId = watch('unitId')

  useEffect(() => {
    if (dialogOpen) reset(residentPoolFormDefaultValues)
  }, [dialogOpen, reset])

  const onSubmit = async (values: ResidentPoolFormValues) => {
    if (!activeShiftDateId) return
    await createPool.mutateAsync({
      shiftEmployeeDateId: activeShiftDateId,
      unitId: values.unitId,
      fromTime: values.fromTime || null,
      toTime: values.toTime || null,
    })
    setDialogOpen(false)
    reset(residentPoolFormDefaultValues)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/admin/shift-roster-management/employees/${employeeId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Resident Assignment</h2>
          <p className="text-sm text-gray-500">
            Assign occupied flats to this employee&apos;s shift dates
            {assignmentIds.length === 0 ? ' · no assignments yet' : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSelectedShiftDateId('')
            }}
          />
        </div>
        <div className="space-y-1 min-w-[200px]">
          <Label>Shift date</Label>
          <Select value={activeShiftDateId || undefined} onValueChange={setSelectedShiftDateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select shift date" />
            </SelectTrigger>
            <SelectContent>
              {shiftDates.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.shiftAssignment?.shift?.name || 'Shift'} · {d.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <RosterPermission action="create">
          <Button
            size="sm"
            className="bg-[#2a517c] hover:bg-[#476587] text-white"
            disabled={!activeShiftDateId}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Flat
          </Button>
        </RosterPermission>
        <Button
          size="sm"
          variant="link"
          onClick={() => navigate(`/admin/shift-roster-management/employees/${employeeId}/daily`)}
        >
          Daily management
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned flats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!activeShiftDateId ? (
            <p className="text-sm text-gray-500">Select a shift date with an active assignment.</p>
          ) : isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : pools.length === 0 ? (
            <p className="text-sm text-gray-500">No flats assigned for this shift date.</p>
          ) : (
            pools.map((p) => {
              const label = formatPoolUnitLabel(p.unit) || p.unitId
              return (
                <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">
                      {p.fromTime && p.toTime ? `${p.fromTime} – ${p.toTime}` : 'Full shift'}
                    </p>
                  </div>
                  <RosterPermission action="delete">
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deletePool.mutate(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </RosterPermission>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Flat</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label>Occupied flat</Label>
              <Controller
                name="unitId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select occupied flat" />
                    </SelectTrigger>
                    <SelectContent>
                      {occupiedFlats.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No occupied flats
                        </SelectItem>
                      ) : (
                        occupiedFlats.map((flat) => (
                          <SelectItem key={flat.id} value={flat.id}>
                            {flat.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unitId && <p className="text-sm text-red-600">{errors.unitId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="time" {...register('fromTime')} />
                {errors.fromTime && <p className="text-sm text-red-600">{errors.fromTime.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="time" {...register('toTime')} />
                {errors.toTime && <p className="text-sm text-red-600">{errors.toTime.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!unitId || createPool.isPending}
                className="bg-[#2a517c] hover:bg-[#476587] text-white"
              >
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ResidentAssignment
