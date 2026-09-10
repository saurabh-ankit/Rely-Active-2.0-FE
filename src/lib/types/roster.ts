export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type SlotGenerationMode = 'Auto Generate' | 'Manual'

export type ShiftEmployeeDateStatus = 'upcoming' | 'on_duty' | 'completed' | 'absent' | 'covered' | 'day_off'

export type LeaveType = 'week_off' | 'sick' | 'casual' | 'planned' | 'holiday'

export type RosterStatus = 'Active' | 'Inactive'

export type RosterAreaType =
  | 'Lobby Area'
  | 'Security Area'
  | 'Maintenance Area'
  | 'Kitchen Area'
  | 'Parking Area'
  | 'Office Area'
  | 'Storage Area'
  | 'Recreation Area'
  | 'Medical Area'
  | 'Others'

export interface ShiftV2 {
  id: string
  name: string
  description: string
  startTime: string
  endTime: string
  locationId: string
  slotGenerationMode?: SlotGenerationMode
  slotDuration?: number | null
  numberOfSlots?: number | null
  isActive: boolean
  isDeleted?: boolean
  isAssigned?: boolean
  assignmentCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface CreateShiftPayload {
  name: string
  description?: string | null
  startTime: string
  endTime: string
  slotGenerationMode?: SlotGenerationMode
  slotDuration?: number | null
  numberOfSlots?: number | null
}

export type UpdateShiftPayload = Partial<CreateShiftPayload> & { isActive?: boolean }

export interface EmployeeShiftAssignment {
  id: string
  employeeId: string
  shiftId: string
  locationId: string
  startDate: string
  endDate: string
  notes?: string | null
  workingDays?: WeekDay[] | null
  areaId?: string | null
  unitId?: string | null
  blockId?: string | null
  floorId?: string | null
  slotTimeRange?: string | null
  isDeleted?: boolean
  employee?: {
    id: string
    email?: string
    username?: string
    profile?: { firstName?: string; lastName?: string }
  }
  shift?: {
    id: string
    name: string
    startTime: string
    endTime: string
  }
  area?: {
    id: string
    areaName: string
  }
  unit?: {
    id: string
    unit_number?: string
  }
  block?: {
    id: string
    block_name?: string
  }
  floor?: {
    id: string
    floor_name?: string | null
    floor_number?: number
  }
  createdAt?: string
  updatedAt?: string
}

export interface CreateEmployeeShiftPayload {
  employeeId: string
  shiftId: string
  startDate: string
  endDate: string
  notes?: string | null
  workingDays?: WeekDay[] | null
  areaId?: string | null
  unitId?: string | null
  blockId?: string | null
  floorId?: string | null
  slotTimeRange?: string | null
}

export interface BulkCreateEmployeeShiftPayload {
  employeeIds: string[]
  shiftId: string
  startDate: string
  endDate: string
  notes?: string | null
  workingDays?: WeekDay[] | null
  areaId?: string | null
  areaIds?: string[]
  unitId?: string | null
  blockId?: string | null
  floorId?: string | null
  slotTimeRange?: string | null
}

export interface ShiftEmployeeDate {
  id: string
  employeeShiftAssignmentId: string
  date: string
  status: ShiftEmployeeDateStatus
  leaveType?: LeaveType | null
  leaveNote?: string | null
  coveredByEmployeeId?: string | null
  areaId?: string | null
  locationId: string
  notes?: string | null
  isDeleted?: boolean
  shiftAssignment?: {
    id: string
    employeeId: string
    shiftId: string
    startDate?: string
    endDate?: string
    notes?: string | null
    workingDays?: WeekDay[] | null
    slotTimeRange?: string | null
    areaId?: string | null
    blockId?: string | null
    floorId?: string | null
    unitId?: string | null
    employee?: {
      id: string
      email?: string
      profile?: { firstName?: string; lastName?: string }
    }
    shift?: { id: string; name: string; startTime: string; endTime: string }
    area?: { id: string; areaName: string }
    block?: { id: string; block_name?: string }
    floor?: { id: string; floor_name?: string | null; floor_number?: number }
    unit?: { id: string; unit_number?: string }
  }
  area?: { id: string; areaName: string }
  coveringEmployee?: {
    id: string
    profile?: { firstName?: string; lastName?: string }
  }
  createdAt?: string
  updatedAt?: string
}

export interface CreateShiftEmployeeDatePayload {
  employeeShiftAssignmentId: string
  date: string
  status?: ShiftEmployeeDateStatus
}

export interface GenerateShiftEmployeeDatesPayload {
  employeeShiftAssignmentId: string
  fromDate: string
  toDate: string
}

export interface MarkDayOffPayload {
  leaveType?: LeaveType
  leaveNote?: string | null
}

export interface CoverShiftDatePayload {
  coveredByEmployeeId: string
  notes?: string | null
}

export interface SwapShiftDatesPayload {
  targetDateId: string
  notes?: string | null
}

export interface ShiftResidentPoolEntry {
  id: string
  shiftEmployeeDateId: string
  unitId: string
  fromTime?: string | null
  toTime?: string | null
  notes?: string | null
  locationId: string
  isDeleted?: boolean
  unit?: {
    id: string
    unit_number?: string
    occupancyStatus?: string
    floor?: {
      id: string
      floor_name?: string | null
      floor_number?: number
      block?: {
        id: string
        block_name?: string
      }
    }
  }
  shiftEmployeeDate?: {
    id: string
    date: string
    status: string
    employeeShiftAssignment?: {
      id: string
      employeeId: string
      shift?: { id: string; name: string; startTime: string; endTime: string }
    }
  }
  createdAt?: string
  updatedAt?: string
}

export interface CreateResidentPoolPayload {
  shiftEmployeeDateId: string
  unitId: string
  fromTime?: string | null
  toTime?: string | null
  notes?: string | null
}

export interface RosterArea {
  id: string
  areaName: string
  areaType: RosterAreaType
  location: string
  capacity?: string | null
  status: RosterStatus
  description?: string | null
  locationId: string
}

export interface CreateAreaPayload {
  areaName: string
  areaType: RosterAreaType
  location: string
  capacity?: string | null
  status?: RosterStatus
  description?: string | null
}

export interface RosterListParams {
  page?: number
  limit?: number | 'all'
  search?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  status?: string
  [key: string]: string | number | undefined
}

export interface RosterApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
}
