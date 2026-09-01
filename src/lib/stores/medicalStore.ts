import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { rosterService } from '@/lib/services/rosterService'

export interface MedicalSpecialization {
  id: string
  name: string
  code: string
  description?: string
  category: 'DOCTOR' | 'NURSE' | 'ALL' | 'OTHER'
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
  isLoadingSpecializations: boolean
  fetchSpecializations: () => Promise<void>
  addSpecialization: (spec: Omit<MedicalSpecialization, 'id' | 'code'> & { code?: string }) => Promise<void>
  removeSpecialization: (id: string) => Promise<void>
  addStaff: (staff: Omit<OnboardedMedicalStaff, 'id'>) => void
  removeStaff: (id: string) => void
}

export const useMedicalStore = create<MedicalStoreState>()(
  persist(
    (set, get) => ({
      specializations: [],
      staffList: [],
      isLoadingSpecializations: false,

      fetchSpecializations: async () => {
        set({ isLoadingSpecializations: true })
        try {
          const res = await rosterService.getSpecializations()
          if (res?.data && Array.isArray(res.data)) {
            set({ specializations: res.data })
          }
        } catch (err) {
          console.error('Failed to fetch medical specializations:', err)
        } finally {
          set({ isLoadingSpecializations: false })
        }
      },

      addSpecialization: async (spec) => {
        try {
          const res = await rosterService.createSpecialization({
            name: spec.name,
            code: spec.code,
            category: spec.category,
            description: spec.description,
          })
          if (res?.data) {
            await get().fetchSpecializations()
          }
        } catch (err) {
          console.error('Failed to create medical specialization:', err)
          const tempId = `spec-${Date.now()}`
          const code = spec.code || spec.name.toUpperCase().replace(/\s+/g, '_')
          set((state) => ({
            specializations: [
              ...state.specializations,
              { id: tempId, name: spec.name, code, category: spec.category, description: spec.description },
            ],
          }))
        }
      },

      removeSpecialization: async (id) => {
        try {
          await rosterService.deleteSpecialization(id)
          await get().fetchSpecializations()
        } catch (err) {
          console.error('Failed to delete medical specialization:', err)
          set((state) => ({
            specializations: state.specializations.filter((s) => s.id !== id),
          }))
        }
      },

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
      partialize: (state) => ({ staffList: state.staffList }),
    }
  )
)
