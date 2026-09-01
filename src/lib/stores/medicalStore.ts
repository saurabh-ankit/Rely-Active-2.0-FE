import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MedicalSpecialization {
  id: string
  name: string
  code: string
  description?: string
  category: 'DOCTOR' | 'NURSE' | 'ALL'
}

export interface OnboardedMedicalStaff {
  id: string
  name: string
  role: 'DOCTOR' | 'NURSE' | 'CARETAKER' | 'EMPLOYEE'
  doctorType?: 'IN_HOUSE' | 'VISITING'
  specialization: string
  medicalLicenseNumber?: string
  assignedClinicRoom?: string
  phone?: string
  email?: string
  department?: string
}

interface MedicalStoreState {
  specializations: MedicalSpecialization[]
  staffList: OnboardedMedicalStaff[]
  addSpecialization: (spec: Omit<MedicalSpecialization, 'id'>) => void
  removeSpecialization: (id: string) => void
  addStaff: (staff: Omit<OnboardedMedicalStaff, 'id'>) => void
  removeStaff: (id: string) => void
}

const DEFAULT_SPECIALIZATIONS: MedicalSpecialization[] = [
  { id: 'spec-1', name: 'Geriatric Medicine', code: 'GERIATRICS', category: 'DOCTOR', description: 'Elderly care & dementia management' },
  { id: 'spec-2', name: 'Cardiology', code: 'CARDIOLOGY', category: 'DOCTOR', description: 'Cardiovascular healthcare' },
  { id: 'spec-3', name: 'Neurology', code: 'NEUROLOGY', category: 'DOCTOR', description: 'Brain & memory disorders' },
  { id: 'spec-4', name: 'General Practice', code: 'GP', category: 'DOCTOR', description: 'Primary health consultations' },
  { id: 'spec-5', name: 'Palliative Nursing', code: 'PALLIATIVE', category: 'NURSE', description: 'Comfort & long-term palliative care' },
  { id: 'spec-6', name: 'ICU & Critical Care', code: 'CRITICAL_CARE', category: 'NURSE', description: 'High dependency unit support' },
  { id: 'spec-7', name: 'Memory Care & ADL', code: 'MEMORY_CARE', category: 'ALL', description: 'Assisted living & resident caregiver' },
  { id: 'spec-8', name: 'Physiotherapy & Wellness', code: 'PHYSIO', category: 'ALL', description: 'Physical rehabilitation & mobility' },
]

export const useMedicalStore = create<MedicalStoreState>()(
  persist(
    (set) => ({
      specializations: DEFAULT_SPECIALIZATIONS,
      staffList: [],

      addSpecialization: (spec) =>
        set((state) => ({
          specializations: [
            ...state.specializations,
            { ...spec, id: `spec-${Date.now()}` },
          ],
        })),

      removeSpecialization: (id) =>
        set((state) => ({
          specializations: state.specializations.filter((s) => s.id !== id),
        })),

      addStaff: (staff) =>
        set((state) => ({
          staffList: [...state.staffList, { ...staff, id: `res-${Date.now()}` }],
        })),

      removeStaff: (id) =>
        set((state) => ({
          staffList: state.staffList.filter((s) => s.id !== id),
        })),
    }),
    {
      name: 'rely_active_medical_store',
    }
  )
)
