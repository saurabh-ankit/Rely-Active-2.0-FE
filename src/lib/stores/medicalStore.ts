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

export const DEFAULT_STAFF: OnboardedMedicalStaff[] = [
  {
    id: 'res-5',
    name: 'Dr. Aarav Sharma',
    role: 'DOCTOR',
    doctorType: 'IN_HOUSE',
    specialization: 'Geriatric Medicine',
    medicalLicenseNumber: 'MCI-884920',
    assignedClinicRoom: 'OPD Clinic Room #102',
    department: 'Geriatric OPD',
  },
  {
    id: 'res-6',
    name: 'Dr. Priya Nair',
    role: 'DOCTOR',
    doctorType: 'VISITING',
    specialization: 'Cardiology',
    medicalLicenseNumber: 'MCI-772109',
    assignedClinicRoom: 'Cardiology OPD Room #105',
    department: 'Cardiology Suite',
  },
  {
    id: 'res-7',
    name: 'Dr. Vikram Seth',
    role: 'DOCTOR',
    doctorType: 'VISITING',
    specialization: 'Neurology',
    medicalLicenseNumber: 'MCI-994112',
    assignedClinicRoom: 'Geriatric Consultation Suite #201',
    department: 'Neurology Dept',
  },
  {
    id: 'res-1',
    name: 'Nurse Sunita Verma',
    role: 'NURSE',
    specialization: 'Palliative Nursing',
    medicalLicenseNumber: 'RN-48190',
    department: 'Clinical Nursing Department',
  },
  {
    id: 'res-3',
    name: 'Nurse Anita Roy',
    role: 'NURSE',
    specialization: 'ICU & Critical Care',
    medicalLicenseNumber: 'RN-51204',
    department: 'High Dependency Unit',
  },
  {
    id: 'res-2',
    name: 'Ramesh Caregiver',
    role: 'CARETAKER',
    specialization: 'Memory Care & ADL',
    department: 'Assisted Living Wing',
  },
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
