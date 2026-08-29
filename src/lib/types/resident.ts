export type ResidentType = 'OWNER' | 'TENANT'
export type OwnershipType = 'PRIMARY' | 'CO_OWNER' | 'DEPENDENT'
export type ResidentStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT'

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface ResidentFamilyMember {
  id?: string
  residentId?: string
  firstName: string
  lastName?: string | null
  relation: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  age?: number | null
  phone?: string | null
  username?: string | null
  password?: string
  email?: string | null
}

export interface ResidentItem {
  id: string
  unitId: string
  locId: string
  companyId?: string | null
  residentType: ResidentType
  ownershipType?: OwnershipType | null
  isResiding: boolean
  firstName: string
  lastName?: string | null
  username?: string | null
  email?: string | null
  phone?: string | null
  emergencyContact?: string | null
  bloodGroup?: string | null
  photoUrl?: string | null
  moveInDate?: string | null
  moveOutDate?: string | null
  status: ResidentStatus
  isActive: boolean
  createdAt: string
  unit?: {
    id: string
    unit_number: string
    occupancyStatus?: string
  }
  familyMembers?: ResidentFamilyMember[]
}

export interface UnitResidentsPayload {
  allOccupants: ResidentItem[]
  residingOccupant?: ResidentItem | null
  owner?: ResidentItem | null
}

export interface CreateResidentPayload {
  unitId: string
  locId: string
  companyId?: string
  residentType: ResidentType
  ownershipType?: OwnershipType
  isResiding?: boolean
  firstName: string
  lastName?: string
  username?: string
  password?: string
  email?: string
  phone?: string
  emergencyContact?: string
  bloodGroup?: string
  photoUrl?: string
  moveInDate?: string
  familyMembers?: ResidentFamilyMember[]
}
