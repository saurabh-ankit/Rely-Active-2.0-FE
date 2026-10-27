import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Droplets,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Pill,
  Stethoscope,
  TriangleAlert,
  User,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { ResidentItem } from '@/lib/types'
import {
  useResidentClinicalQuery,
  useResidentDocumentsQuery,
  useResidentLabReportsQuery,
} from '@/hooks/react-query/resident'
import { useCareTaskAssignmentsQuery } from '@/hooks/react-query/medical'
import { cn } from '@/lib/utils'
import { MedicationsTab } from './medical/MedicationsTab'
import { VitalsTab } from './medical/VitalsTab'
import { CareTaskTab } from './medical/CareTaskTab'
import { LabReportsTab } from './medical/LabReportsTab'
import { AllergiesTab } from './medical/AllergiesTab'
import { FluidBalanceTab } from './medical/FluidBalanceTab'
import { IncidentsTab } from './medical/IncidentsTab'
import { TimelineTab } from './medical/TimelineTab'
import { DoctorSuggestionsTab } from './medical/DoctorSuggestionsTab'
import { DocumentsTab } from './medical/DocumentsTab'
import { ClinicalErrorBanner } from './medical/ClinicalShared'

export interface ResidentMedicalTabProps {
  resident: ResidentItem
  canUpdateResident: boolean
  canViewMedical?: boolean
  overviewContent?: React.ReactNode
  showOverviewTab?: boolean
  onAssignCareTeam: () => void
  onAssignCareTask: () => void
}

export type MedicalSubTab =
  | 'overview'
  | 'medication'
  | 'vitals'
  | 'care-task'
  | 'lab-reports'
  | 'allergies'
  | 'fluid-balance'
  | 'incidents'
  | 'timeline'
  | 'doctor-suggestions'
  | 'documents'

const VALID_SUBTABS: MedicalSubTab[] = [
  'overview',
  'medication',
  'vitals',
  'care-task',
  'lab-reports',
  'allergies',
  'fluid-balance',
  'incidents',
  'timeline',
  'doctor-suggestions',
  'documents',
]

interface SubTabItemConfig {
  value: MedicalSubTab
  label: string
  icon: LucideIcon
  count?: number
  badgeVariant?: 'default' | 'warning' | 'danger'
}

export const ResidentMedicalTab: React.FC<ResidentMedicalTabProps> = ({
  resident,
  canUpdateResident,
  canViewMedical = true,
  overviewContent,
  showOverviewTab = false,
  onAssignCareTeam,
  onAssignCareTask,
}) => {
  const propertyId = resident.locId || (resident as unknown as Record<string, string>).loc_id || null

  const [searchParams, setSearchParams] = useSearchParams()
  const subtabParam = searchParams.get('subtab') as MedicalSubTab | null
  const tabParam = searchParams.get('tab')

  const initialSubTab: MedicalSubTab = useMemo(() => {
    if (subtabParam && VALID_SUBTABS.includes(subtabParam)) {
      if (subtabParam === 'overview' && !showOverviewTab) {
        return 'medication'
      }
      return subtabParam
    }
    if (tabParam === 'personal' && showOverviewTab) {
      return 'overview'
    }
    if (tabParam === 'medical') {
      return 'medication'
    }
    return showOverviewTab ? 'overview' : 'medication'
  }, [subtabParam, tabParam, showOverviewTab])

  const [activeSubTab, setActiveSubTab] = useState<MedicalSubTab>(initialSubTab)
  const mobileTabContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll active subtab into center view on mobile horizontally
  useEffect(() => {
    if (!mobileTabContainerRef.current) return
    const activeButton = mobileTabContainerRef.current.querySelector<HTMLButtonElement>(`[data-tab="${activeSubTab}"]`)
    if (activeButton) {
      activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeSubTab])

  const clinicalQuery = useResidentClinicalQuery(resident.id, canViewMedical)
  const labReportsQuery = useResidentLabReportsQuery(resident.id, canViewMedical)
  const documentsQuery = useResidentDocumentsQuery(resident.id, canViewMedical)
  const careTasksQuery = useCareTaskAssignmentsQuery({
    residentId: resident.id,
    propertyId: propertyId,
  })

  const clinical = clinicalQuery.data
  const isClinicalLoading = clinicalQuery.isLoading
  const clinicalError = clinicalQuery.isError ? (
    <ClinicalErrorBanner message="Failed to load clinical records for this resident." />
  ) : null

  // Calculate live counts for badges
  const medicationCount = (clinical?.medications?.length ?? 0) + (clinical?.insulin?.length ?? 0)
  const vitalsCount = clinical?.vitals?.length ?? 0
  const allergiesCount = clinical?.allergies?.length ?? 0
  const fluidBalanceCount = clinical?.fluidBalances?.length ?? 0
  const incidentsCount = clinical?.incidents?.length ?? 0
  const doctorNotesCount = clinical?.doctorNotes?.length ?? 0
  const labReportsCount = labReportsQuery.data?.length ?? 0
  const documentsCount = documentsQuery.data?.length ?? 0

  const careTasksCount = useMemo(() => {
    const data = careTasksQuery.data
    if (!data) return undefined
    if (Array.isArray(data)) return data.length
    if (Array.isArray((data as unknown as { data: unknown[] }).data)) {
      return (data as unknown as { data: unknown[] }).data.length
    }
    return undefined
  }, [careTasksQuery.data])

  const tabsList: SubTabItemConfig[] = [
    ...(showOverviewTab
      ? [
          {
            value: 'overview' as const,
            label: 'Overview',
            icon: User,
            badgeVariant: 'default' as const,
          },
        ]
      : []),
    ...(canViewMedical
      ? [
          {
            value: 'medication' as const,
            label: 'Medication',
            icon: Pill,
            count: medicationCount,
            badgeVariant: 'default' as const,
          },
          {
            value: 'vitals' as const,
            label: 'Vitals',
            icon: Activity,
            count: vitalsCount,
            badgeVariant: 'default' as const,
          },
          {
            value: 'care-task' as const,
            label: 'Care Task',
            icon: HeartPulse,
            count: careTasksCount,
            badgeVariant: 'default' as const,
          },
          {
            value: 'lab-reports' as const,
            label: 'Lab Reports',
            icon: FlaskConical,
            count: labReportsCount,
            badgeVariant: 'default' as const,
          },
          {
            value: 'allergies' as const,
            label: 'Allergies',
            icon: AlertTriangle,
            count: allergiesCount,
            badgeVariant: 'warning' as const,
          },
          {
            value: 'fluid-balance' as const,
            label: 'Fluid Balance',
            icon: Droplets,
            count: fluidBalanceCount,
            badgeVariant: 'default' as const,
          },
          {
            value: 'incidents' as const,
            label: 'Incident',
            icon: TriangleAlert,
            count: incidentsCount,
            badgeVariant: 'danger' as const,
          },
          {
            value: 'timeline' as const,
            label: 'Timeline',
            icon: History,
          },
          {
            value: 'doctor-suggestions' as const,
            label: 'Doctor Notes',
            icon: Stethoscope,
            count: doctorNotesCount,
            badgeVariant: 'default' as const,
          },
          {
            value: 'documents' as const,
            label: 'Documents',
            icon: FileText,
            count: documentsCount,
            badgeVariant: 'default' as const,
          },
        ]
      : []),
  ]

  const handleSubTabChange = (tab: MedicalSubTab) => {
    setActiveSubTab(tab)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('subtab', tab)
    setSearchParams(nextParams, { replace: true })
  }

  // Active tab content renderer
  const renderActiveContent = () => {
    switch (activeSubTab) {
      case 'overview':
        return overviewContent ? <div className="w-full">{overviewContent}</div> : null
      case 'medication':
        return (
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
        )
      case 'vitals':
        return (
          <>
            {clinicalError}
            <VitalsTab
              residentId={resident.id}
              canUpdateResident={canUpdateResident}
              vitals={clinical?.vitals ?? []}
              isLoading={isClinicalLoading}
            />
          </>
        )
      case 'care-task':
        return (
          <CareTaskTab
            resident={resident}
            propertyId={propertyId}
            canUpdateResident={canUpdateResident}
            onAssignCareTeam={onAssignCareTeam}
            onAssignCareTask={onAssignCareTask}
          />
        )
      case 'lab-reports':
        return (
          <>
            {labReportsQuery.isError && <ClinicalErrorBanner message="Failed to load lab reports for this resident." />}
            <LabReportsTab
              residentId={resident.id}
              canUpdateResident={canUpdateResident}
              reports={labReportsQuery.data ?? []}
              isLoading={labReportsQuery.isLoading}
            />
          </>
        )
      case 'allergies':
        return (
          <>
            {clinicalError}
            <AllergiesTab
              residentId={resident.id}
              canUpdateResident={canUpdateResident}
              allergies={clinical?.allergies ?? []}
              isLoading={isClinicalLoading}
            />
          </>
        )
      case 'fluid-balance':
        return (
          <>
            {clinicalError}
            <FluidBalanceTab
              residentId={resident.id}
              canUpdateResident={canUpdateResident}
              fluidBalances={clinical?.fluidBalances ?? []}
              isLoading={isClinicalLoading}
            />
          </>
        )
      case 'incidents':
        return (
          <>
            {clinicalError}
            <IncidentsTab
              residentId={resident.id}
              canUpdateResident={canUpdateResident}
              incidents={clinical?.incidents ?? []}
              isLoading={isClinicalLoading}
            />
          </>
        )
      case 'timeline':
        return <TimelineTab residentId={resident.id} minDate={resident.moveInDate} />
      case 'doctor-suggestions':
        return (
          <>
            {clinicalError}
            <DoctorSuggestionsTab doctorNotes={clinical?.doctorNotes ?? []} isLoading={isClinicalLoading} />
          </>
        )
      case 'documents':
        return <DocumentsTab residentId={resident.id} canUpdateResident={canUpdateResident} />
      default:
        return null
    }
  }

  return (
    <Card className="gap-0 rounded-2xl md:rounded-3xl border border-gray-200/90 bg-slate-50/70 p-3.5 sm:p-5 md:p-6 shadow-2xs dark:border-gray-800 dark:bg-slate-900/50 w-full min-h-0 md:min-h-[720px]">
      {/* ── Mobile Subtab Bar (< md, horizontal scroll with auto-center) ──────── */}
      <div className="md:hidden w-full mb-3.5">
        <div
          ref={mobileTabContainerRef}
          className="flex items-center gap-1 overflow-x-auto p-1 rounded-full bg-slate-200/70 border border-slate-300/70 shadow-2xs dark:bg-slate-800/80 dark:border-slate-700/80 scrollbar-none scroll-smooth touch-pan-x"
        >
          {tabsList.map((tab) => {
            const isActive = activeSubTab === tab.value
            const Icon = tab.icon
            const count = tab.count
            return (
              <button
                key={tab.value}
                data-tab={tab.value}
                type="button"
                onClick={() => handleSubTabChange(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-4 rounded-full text-xs whitespace-nowrap font-semibold transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-[#005390] text-white shadow-xs font-semibold'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10',
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[9px] font-extrabold',
                      tab.badgeVariant === 'danger'
                        ? 'bg-rose-500 text-white'
                        : tab.badgeVariant === 'warning'
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-100 text-gray-700 border border-gray-200/80 dark:bg-slate-700 dark:text-gray-200',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-5 lg:gap-6 w-full min-h-0 md:min-h-[680px]">
        {/* ── Left Sidebar (Desktop md and up, responsive width: w-48 on md, w-56 on lg, w-60 on xl) ─ */}
        <aside className="hidden md:flex flex-col shrink-0 w-48 lg:w-56 xl:w-60 h-[720px] min-h-[720px]">
          {/* Navigation Tabs List */}
          <nav className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {tabsList.map((tab) => {
              const isActive = activeSubTab === tab.value
              const Icon = tab.icon
              const count = tab.count

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleSubTabChange(tab.value)}
                  className={cn(
                    'group relative flex w-full items-center gap-2.5 lg:gap-3 rounded-xl px-3 lg:px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer',
                    isActive
                      ? 'bg-white text-[#005390] shadow-xs border border-gray-200/80 font-bold dark:bg-slate-800 dark:text-sky-400 dark:border-gray-700'
                      : 'text-gray-600 hover:bg-white/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800/60 dark:hover:text-white',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-transform group-hover:scale-105',
                      isActive
                        ? 'text-[#005390] dark:text-sky-400'
                        : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-200',
                    )}
                  />
                  <span className="flex-1 text-left truncate">{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-tight shrink-0 transition-colors',
                        tab.badgeVariant === 'danger'
                          ? 'bg-rose-500 text-white shadow-2xs'
                          : tab.badgeVariant === 'warning'
                            ? 'bg-amber-400 text-slate-950 font-black shadow-2xs'
                            : isActive
                              ? 'bg-[#005390]/10 text-[#005390] dark:bg-sky-950/60 dark:text-sky-300'
                              : 'bg-white text-gray-700 border border-gray-200/80 dark:bg-slate-800 dark:text-gray-300 dark:border-gray-700 group-hover:bg-slate-100',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* ── Right Content Area (Responsive width and fluid height on mobile) ─ */}
        <main className="flex-1 min-w-0 min-h-0 md:min-h-[720px] flex flex-col w-full">{renderActiveContent()}</main>
      </div>
    </Card>
  )
}

export default ResidentMedicalTab
