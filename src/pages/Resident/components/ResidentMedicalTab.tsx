import React, { useState } from 'react'
import { Activity, AlertTriangle, FileText, FlaskConical, HeartPulse, History, Pill, Stethoscope } from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { ResponsiveTabs, type TabItem } from '@/components/common/ResponsiveTabs'
import { useResidentClinicalQuery, useResidentLabReportsQuery } from '@/hooks/react-query/resident'
import { MedicationsTab } from './medical/MedicationsTab'
import { VitalsTab } from './medical/VitalsTab'
import { CareTaskTab } from './medical/CareTaskTab'
import { LabReportsTab } from './medical/LabReportsTab'
import { AllergiesTab } from './medical/AllergiesTab'
import { TimelineTab } from './medical/TimelineTab'
import { DoctorSuggestionsTab } from './medical/DoctorSuggestionsTab'
import { DocumentsTab } from './medical/DocumentsTab'
import { ClinicalErrorBanner } from './medical/ClinicalShared'

export interface ResidentMedicalTabProps {
  resident: ResidentItem
  canUpdateResident: boolean
  onAssignCareTeam: () => void
  onAssignCareTask: () => void
}

type MedicalSubTab =
  'medication' | 'vitals' | 'care-task' | 'lab-reports' | 'allergies' | 'timeline' | 'doctor-suggestions' | 'documents'

export const ResidentMedicalTab: React.FC<ResidentMedicalTabProps> = ({
  resident,
  canUpdateResident,
  onAssignCareTeam,
  onAssignCareTask,
}) => {
  const propertyId = resident.locId || (resident as unknown as Record<string, string>).loc_id || null
  const [activeSubTab, setActiveSubTab] = useState<MedicalSubTab>('medication')

  const clinicalQuery = useResidentClinicalQuery(resident.id)
  const labReportsQuery = useResidentLabReportsQuery(resident.id)

  const clinical = clinicalQuery.data
  const isClinicalLoading = clinicalQuery.isLoading
  const clinicalError = clinicalQuery.isError ? (
    <ClinicalErrorBanner message="Failed to load clinical records for this resident." />
  ) : null

  const tabs: TabItem[] = [
    {
      value: 'medication',
      label: 'Medication',
      shortLabel: 'Meds',
      icon: Pill,
      content: (
        <>
          {clinicalError}
          <MedicationsTab
            residentId={resident.id}
            canUpdateResident={canUpdateResident}
            medications={clinical?.medications ?? []}
            insulin={clinical?.insulin ?? []}
            isLoading={isClinicalLoading}
          />
        </>
      ),
    },
    {
      value: 'vitals',
      label: 'Vitals',
      shortLabel: 'Vitals',
      icon: Activity,
      content: (
        <>
          {clinicalError}
          <VitalsTab
            residentId={resident.id}
            canUpdateResident={canUpdateResident}
            vitals={clinical?.vitals ?? []}
            isLoading={isClinicalLoading}
          />
        </>
      ),
    },
    {
      value: 'care-task',
      label: 'Care Task',
      shortLabel: 'Tasks',
      icon: HeartPulse,
      content: (
        <CareTaskTab
          resident={resident}
          propertyId={propertyId}
          canUpdateResident={canUpdateResident}
          onAssignCareTeam={onAssignCareTeam}
          onAssignCareTask={onAssignCareTask}
        />
      ),
    },
    {
      value: 'lab-reports',
      label: 'Lab Reports',
      shortLabel: 'Labs',
      icon: FlaskConical,
      content: (
        <>
          {labReportsQuery.isError && <ClinicalErrorBanner message="Failed to load lab reports for this resident." />}
          <LabReportsTab
            residentId={resident.id}
            canUpdateResident={canUpdateResident}
            reports={labReportsQuery.data ?? []}
            isLoading={labReportsQuery.isLoading}
          />
        </>
      ),
    },
    {
      value: 'allergies',
      label: 'Allergies',
      shortLabel: 'Allergies',
      icon: AlertTriangle,
      content: (
        <>
          {clinicalError}
          <AllergiesTab
            residentId={resident.id}
            canUpdateResident={canUpdateResident}
            allergies={clinical?.allergies ?? []}
            isLoading={isClinicalLoading}
          />
        </>
      ),
    },
    {
      value: 'timeline',
      label: 'Timeline',
      shortLabel: 'Timeline',
      icon: History,
      content: <TimelineTab residentId={resident.id} minDate={resident.moveInDate} />,
    },
    {
      value: 'doctor-suggestions',
      label: 'Doctor Notes',
      shortLabel: 'Doctor',
      icon: Stethoscope,
      content: (
        <>
          {clinicalError}
          <DoctorSuggestionsTab doctorNotes={clinical?.doctorNotes ?? []} isLoading={isClinicalLoading} />
        </>
      ),
    },
    {
      value: 'documents',
      label: 'Documents',
      shortLabel: 'Docs',
      icon: FileText,
      content: <DocumentsTab residentId={resident.id} canUpdateResident={canUpdateResident} />,
    },
  ]

  return (
    <ResponsiveTabs
      tabs={tabs}
      value={activeSubTab}
      onValueChange={(value) => setActiveSubTab(value as MedicalSubTab)}
      className="space-y-6"
    />
  )
}

export default ResidentMedicalTab
