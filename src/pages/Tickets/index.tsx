import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Plus,
  MessageSquare,
  UserPlus,
  Clock,
  AlertCircle,
  Home,
  CheckCircle2,
  Ticket as TicketIcon,
  List,
  User,
  Check,
  FileText,
  Receipt,
  IndianRupee,
  Mic,
  Volume2,
  Image as ImageIcon,
  Eye,
  Building2,
  ShieldCheck,
  ArrowUpCircle,
  Wrench,
  Loader2,
} from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/api/axios'
import { useTicketStore } from '@/lib/stores/ticketStore'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { notifyError, notifySuccess } from '@/utils/toast'
import { getDepartmentManagerType } from '@/utils/departmentManager'
import type { Ticket, TicketCategoryMaster, TicketFeedback, TicketPriority, TicketStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CreateTicketModal } from './components/CreateTicketModal'
import { SelectPersonDrawer } from './components/SelectPersonDrawer'
import { AddInvoiceModal } from './components/AddInvoiceModal'
import { ConfirmStatusChangeDialog } from './components/ConfirmStatusChangeDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
//import { Switch } from '@/components/ui/switch'

interface ParsedCompletion {
  notes: string | null
  amount: number | string | null
  invoiceUrl: string | null
  invoiceNumber: string | null
  audioUrl: string | null
  /** Staff voice notes: the legacy single recording plus L3 app voice notes. */
  audioUrls: string[]
  photos: string[]
  completedByName: string | null
  completedAt: string | null
}

function isTicketEscalated(ticket: Ticket | null | undefined): boolean {
  if (!ticket) return false
  return Boolean(
    ticket.escalatedAt ||
    ticket.escalatedByName ||
    ticket.escalatedBy ||
    String(ticket.resolutionNotes || '').includes('[ESCALATED'),
  )
}

function escalatedByLabel(ticket: Ticket | null | undefined): string | null {
  if (!ticket) return null
  return ticket.escalatedByName || ticket.escalatedBy || null
}

function TicketScreenLoader({ title = 'Loading...', subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center mb-3">
        <div className="absolute w-12 h-12 rounded-full bg-[#005390]/15 animate-ping" />
        <div className="relative w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-2xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#005390]" />
        </div>
      </div>
      <span className="text-sm font-bold text-gray-800">{title}</span>
      {subtitle && <span className="text-xs text-gray-400 mt-1">{subtitle}</span>}
    </div>
  )
}

/** Photos and voice notes the resident attached when raising the ticket. */
interface ParsedRequestMedia {
  photos: string[]
  audioUrls: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAttachments(ticket: Ticket | null): any {
  if (!ticket) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let atts: any = ticket.attachments
  if (typeof atts === 'string') {
    try {
      atts = JSON.parse(atts)
    } catch {
      atts = null
    }
  }
  return atts
}

/** Accepts plain URLs and L3 upload objects (`{ url }`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUrlList(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item : item?.url || item?.location || ''))
    .filter((url: string) => typeof url === 'string' && url.trim().length > 0)
}

const fullName = (p?: { firstName?: string | null; lastName?: string | null } | null) =>
  `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim()

/** Who raised the ticket: the family member or resident by name (from the app), else the staff member. */
function RaisedBy({ ticket }: { ticket: Ticket }) {
  const member = fullName(ticket.familyMember)
  const staff = ticket.raisedBy || userDisplayName(ticket.raisedByUser)
  const resident = fullName(ticket.resident)
  const [name, tag] = member
    ? [member, `Family member${ticket.familyMember?.relation ? ` · ${ticket.familyMember.relation}` : ''}`]
    : staff
      ? [staff, 'Staff']
      : [resident || 'Resident', resident ? 'Resident' : null]
  return (
    <span className="flex items-center gap-2">
      <span className="font-bold text-gray-900">{name}</span>
      {tag && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            tag === 'Staff'
              ? 'bg-gray-100 text-gray-600'
              : tag === 'Resident'
                ? 'bg-sky-50 text-sky-700'
                : 'bg-purple-50 text-purple-700',
          )}
        >
          {tag}
        </span>
      )}
    </span>
  )
}

function userDisplayName(
  user?: {
    profile?: {
      firstName?: string | null
      lastName?: string | null
      first_name?: string | null
      last_name?: string | null
    } | null
    firstName?: string | null
    lastName?: string | null
    name?: string
    username?: string
    email?: string
  } | null,
  fallback?: string,
) {
  if (!user) return fallback || null
  const profileFirst = user.profile?.firstName || user.profile?.first_name || user.firstName
  const profileLast = user.profile?.lastName || user.profile?.last_name || user.lastName
  const full = `${profileFirst || ''} ${profileLast || ''}`.trim()
  if (full) return full
  if (user.name) return user.name
  if (user.username && !user.username.includes('@')) return user.username
  if (user.email) {
    const prefix = user.email.split('@')[0]
    return prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : user.email
  }
  return fallback || null
}

function formatTicketDateTime(dateVal?: string | Date | null) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return ''

  const day = String(d.getDate()).padStart(2, '0')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = monthNames[d.getMonth()]
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const currentYear = new Date().getFullYear()
  if (d.getFullYear() !== currentYear) {
    return `${day} ${month} ${d.getFullYear()}, ${time}`
  }
  return `${day} ${month}, ${time}`
}

/** Tickets the signed-in user has already opened, persisted via Zustand store. */
const readViewedTickets = (userId?: string | null): string[] => {
  return useTicketStore.getState().getViewedTickets(userId)
}

const writeViewedTickets = (userId: string | undefined | null, ids: string[]) => {
  ids.forEach((id) => useTicketStore.getState().markTicketAsViewed(userId, id))
}

/** Used only until the real departments and job categories load. */
const FEEDBACK_RATING_STYLES: Record<string, string> = {
  GOOD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AVERAGE: 'bg-amber-50 text-amber-700 border-amber-200',
  POOR: 'bg-rose-50 text-rose-700 border-rose-200',
}

const FEEDBACK_RATING_LABELS: Record<string, string> = {
  GOOD: 'Good',
  AVERAGE: 'Average',
  POOR: 'Poor',
}

/** "Gopi (Son)" when a family member left it, otherwise the resident's name. */
const describeFeedbackAuthor = (feedback: TicketFeedback): string => {
  const member = feedback.familyMember
  if (member) {
    const name = `${member.firstName || ''} ${member.lastName || ''}`.trim()
    return member.relation ? `${name} (${member.relation})` : name
  }

  const resident = feedback.resident
  if (resident) return `${resident.firstName || ''} ${resident.lastName || ''}`.trim()
  return 'Resident'
}

const FALLBACK_JOB_CATEGORIES: Record<string, string[]> = {
  CON: ['Housekeeping', 'Laundry', 'Customer Support', 'Transportation', 'Others'],
  RNM: ['Electrical', 'Carpentry', 'Plumbing', 'Miscellaneous'],
}

/** Maps a ticket's department name / category enum onto a department code. */
function resolveDepartmentCode(ticket: Ticket | null): string {
  const text = `${ticket?.department?.name || ''} ${ticket?.category || ''}`.toUpperCase()
  if (text.includes('CONCIERGE') || text.includes('CON')) return 'CON'
  if (text.includes('HOUSEKEEPING')) return 'HK'
  if (text.includes('FOOD') || text.includes('BEVERAGE') || text.includes('FNB')) return 'FNB'
  if (text.includes('SECURITY') || text.includes('GATE')) return 'SEC'
  if (text.includes('EVENT')) return 'EVT'
  return 'RNM'
}

const AUDIO_FILE_PATTERN = /\.(webm|mp3|m4a|wav|ogg|oga|opus|aac|3gp|amr|caf)(\?|$)/i

const isAudioUrl = (url: string) => AUDIO_FILE_PATTERN.test(url) || url.startsWith('data:audio')

/** The web create form writes this placeholder when only a voice note was recorded. */
const isVoiceNotePlaceholder = (text: string) =>
  text
    .replace(/[^a-z ]/gi, '')
    .trim()
    .toLowerCase() === 'voice note recorded'

function parseTicketRequestMedia(ticket: Ticket | null): ParsedRequestMedia | null {
  const atts = parseAttachments(ticket)
  if (!atts) return null

  // Web tickets store a plain array of files; L1 resident tickets store { photos, audioUrl }.
  const listed = Array.isArray(atts) ? toUrlList(atts) : [...toUrlList(atts.photos), ...toUrlList(atts.files)]
  const photos = listed.filter((url) => !isAudioUrl(url))
  const audioUrls = [
    ...(Array.isArray(atts)
      ? []
      : [atts.audioUrl, atts.voiceNote].filter(
          (url: unknown): url is string => typeof url === 'string' && url.length > 0,
        )),
    // Older web tickets kept the voice note alongside the photos.
    ...listed.filter((url) => isAudioUrl(url)),
  ]

  if (photos.length === 0 && audioUrls.length === 0) return null
  return { photos, audioUrls }
}

function parseTicketCompletion(ticket: Ticket | null): ParsedCompletion | null {
  if (!ticket) return null
  const atts = parseAttachments(ticket)

  // `completion` is written by the older L3 flow; `workDetails` by the current staff app.
  const comp = atts?.completion || null
  const workDetails = atts?.workDetails || null

  const notes = comp?.resolutionNotes || ticket.resolutionNotes || null
  const amount = comp?.amount ?? ticket.invoiceAmount ?? null
  const invoiceUrl = comp?.invoiceUrl || null
  const invoiceNumber = comp?.invoiceNumber || null

  const audioUrls = [...(comp?.audioUrl ? [comp.audioUrl] : []), ...toUrlList(workDetails?.voiceNotes)]
  const photos = [...toUrlList(comp?.photos), ...toUrlList(workDetails?.photos)]

  const completedByName = comp?.completedByName || userDisplayName(ticket.completedByUser) || ticket.completedBy || null
  const completedAt = comp?.completedAt || ticket.completedAt || ticket.resolvedAt || ticket.closedAt || null

  if (
    !notes &&
    (amount === null || amount === undefined) &&
    !invoiceUrl &&
    audioUrls.length === 0 &&
    photos.length === 0
  ) {
    return null
  }

  return {
    notes,
    amount: amount === null || amount === undefined ? null : amount,
    invoiceUrl,
    invoiceNumber,
    audioUrl: audioUrls[0] || null,
    audioUrls,
    photos,
    completedByName,
    completedAt,
  }
}

interface ParsedTicketMedia {
  notes: string | null
  audioUrl: string | null
  photos: string[]
}

function parseTicketMedia(ticket: Ticket | null): ParsedTicketMedia {
  if (!ticket) return { notes: null, audioUrl: null, photos: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let atts: any = ticket.attachments
  if (typeof atts === 'string') {
    try {
      atts = JSON.parse(atts)
    } catch {
      atts = null
    }
  }

  // 1. Resident note / message
  const desc = ticket.description ? ticket.description.trim() : ''
  const title = ticket.title ? ticket.title.trim() : ''
  const attsNotes = (atts?.notes || atts?.note || atts?.message || '').trim()

  let notes: string | null = null
  if (desc && desc.toLowerCase() !== title.toLowerCase()) {
    notes = desc
  } else if (attsNotes && attsNotes.toLowerCase() !== title.toLowerCase()) {
    notes = attsNotes
  } else if (
    desc &&
    !desc.toLowerCase().startsWith('repair & maintenance') &&
    !desc.toLowerCase().startsWith('concierge')
  ) {
    notes = desc
  } else if (
    attsNotes &&
    !attsNotes.toLowerCase().startsWith('repair & maintenance') &&
    !attsNotes.toLowerCase().startsWith('concierge')
  ) {
    notes = attsNotes
  }

  // 2. Voice note / audio
  const audioUrl: string | null =
    atts?.audioUrl ||
    atts?.voiceUrl ||
    atts?.voiceNote ||
    atts?.audio ||
    atts?.voice ||
    (typeof atts?.completion?.audioUrl === 'string' ? atts.completion.audioUrl : null) ||
    null

  // 3. Images / photos
  const rawPhotos =
    atts?.photos ||
    atts?.photoUrls ||
    atts?.images ||
    atts?.files ||
    (Array.isArray(atts) ? atts : null) ||
    (Array.isArray(atts?.completion?.photos) ? atts.completion.photos : null) ||
    []

  const photoList = Array.isArray(rawPhotos) ? rawPhotos : typeof rawPhotos === 'string' ? [rawPhotos] : []
  const allUrls: string[] = photoList.filter((p: unknown): p is string => typeof p === 'string' && p.trim() !== '')

  // Web-created tickets kept the voice note in the same list as the photos.
  const photos = allUrls.filter((url) => !isAudioUrl(url))
  const finalAudioUrl = audioUrl || allUrls.find((url) => isAudioUrl(url)) || null

  return {
    notes: notes && isVoiceNotePlaceholder(notes) ? null : notes,
    audioUrl: finalAudioUrl,
    photos,
  }
}

export default function TicketsPage() {
  const { selectedLocationId, hasResourcePermission } = useLocationContext()
  const canCreateTicket = hasResourcePermission('TICKETS', 'create')
  const canUpdateTicket = hasResourcePermission('TICKETS', 'update')
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [categories, setCategories] = useState<TicketCategoryMaster[]>([])
  const [activeTab, setActiveTab] = useState<'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED'>('OPEN')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  //const [automateTickets, setAutomateTickets] = useState(false)

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isAssignDrawerOpen, setIsAssignDrawerOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isTatModalOpen, setIsTatModalOpen] = useState(false)
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  // Status picked in the dropdown, waiting for the admin to confirm it.
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)
  const [viewedTicketIds, setViewedTicketIds] = useState<Set<string>>(() => new Set(readViewedTickets(user?.id)))

  const selectedTicketIdRef = useRef<string | undefined>(selectedTicket?.id)
  useEffect(() => {
    selectedTicketIdRef.current = selectedTicket?.id
  }, [selectedTicket?.id])

  const activeTabRef = useRef(activeTab)
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Fetch Master Categories & Sub-Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const url = API_ENDPOINTS.tickets.categories(selectedLocationId)
        const res = await apiClient.get(url)
        if (res.data?.data) {
          setCategories(res.data.data)
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      }
    }

    fetchCategories()
  }, [selectedLocationId])

  const managerType = getDepartmentManagerType(user)

  const displayTickets = useMemo(() => {
    if (managerType === 'RNM') {
      return tickets.filter((t) => resolveDepartmentCode(t) === 'RNM')
    }
    if (managerType === 'CON') {
      return tickets.filter((t) => resolveDepartmentCode(t) === 'CON')
    }
    return tickets
  }, [tickets, managerType])

  // Fetch Tickets matching location & active tab
  const fetchTickets = useCallback(
    async (isSilent = false) => {
      if (!selectedLocationId) return
      const currentRequestedTab = activeTabRef.current
      if (!isSilent) {
        setIsLoading(true)
      }
      try {
        const startTime = Date.now()
        const url = API_ENDPOINTS.tickets.list(selectedLocationId)
        const res = await apiClient.get(url, {
          params: {
            tab: currentRequestedTab,
          },
        })

        // Ignore response if the active tab changed while request was in-flight
        if (activeTabRef.current !== currentRequestedTab) return

        // Smooth transition guarantee so the loader shows cleanly without rapid flicker
        const elapsed = Date.now() - startTime
        if (elapsed < 250 && !isSilent) {
          await new Promise((resolve) => setTimeout(resolve, 250 - elapsed))
        }
        if (activeTabRef.current !== currentRequestedTab) return

        if (res.data?.data) {
          const fetchedTickets: Ticket[] = res.data.data
          setTickets(fetchedTickets)

          const filtered =
            managerType === 'RNM'
              ? fetchedTickets.filter((t) => resolveDepartmentCode(t) === 'RNM')
              : managerType === 'CON'
                ? fetchedTickets.filter((t) => resolveDepartmentCode(t) === 'CON')
                : fetchedTickets

          if (filtered.length > 0) {
            const currentId = selectedTicketIdRef.current
            const matching = currentId ? filtered.find((t) => t.id === currentId) : null
            setSelectedTicket(matching || filtered[0])
          } else {
            setSelectedTicket(null)
          }
        }
      } catch (err) {
        console.error('Failed to fetch tickets:', err)
      } finally {
        if (activeTabRef.current === currentRequestedTab) {
          setIsLoading(false)
        }
      }
    },
    [selectedLocationId, managerType],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets()
  }, [activeTab, fetchTickets])

  // Handle Option Update (Category, Sub-Category, TAT, Priority, Status)
  const handleUpdateOption = async (payload: {
    categoryId?: string
    subCategoryId?: string
    tatOption?: string
    priority?: TicketPriority
    status?: TicketStatus
  }): Promise<boolean> => {
    if (!selectedTicket) return false
    try {
      const url = API_ENDPOINTS.tickets.updateOptions(selectedTicket.id, selectedLocationId)
      await apiClient.patch(url, payload)

      // Optimistic update
      setSelectedTicket((prev) => (prev ? { ...prev, ...payload } : null))
      fetchTickets(true)
      return true
    } catch (err) {
      console.error('Failed to update ticket option:', err)
      return false
    }
  }

  /** Runs the status change the admin confirmed in the dialog. */
  const handleConfirmStatusChange = async () => {
    if (!pendingStatus || changingStatus) return
    setChangingStatus(true)
    const ok = await handleUpdateOption({ status: pendingStatus })
    setChangingStatus(false)
    if (ok) {
      notifySuccess('Ticket status updated')
      setPendingStatus(null)
    } else {
      notifyError('Could not update the ticket status')
    }
  }

  // Verify a completed ticket: admin sign-off that closes it.
  const handleVerifyTicket = async () => {
    if (!selectedTicket || verifying) return
    setVerifying(true)
    try {
      const url = API_ENDPOINTS.tickets.verify(selectedTicket.id, selectedLocationId)
      const response = await apiClient.patch(url, {})
      const updated = response.data?.data
      setSelectedTicket((prev) => (prev ? { ...prev, ...(updated || {}) } : prev))
      notifySuccess('Ticket verified and closed')
      fetchTickets(true)
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not verify this ticket'
      notifyError(message)
    } finally {
      setVerifying(false)
    }
  }

  // Find active category object & sub-categories
  const { data: departments = [] } = useDepartmentsQuery()

  /** Marks a ticket as opened by this user, which clears its NEW tag. */
  const markTicketViewed = useCallback(
    (ticketId: string) => {
      setViewedTicketIds((prev) => {
        if (prev.has(ticketId)) return prev
        const next = new Set(prev)
        next.add(ticketId)
        writeViewedTickets(user?.id, Array.from(next))
        return next
      })
    },
    [user?.id],
  )

  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isTicketSwitching, setIsTicketSwitching] = useState(false)

  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current)
      }
    }
  }, [])

  const handleSelectTicket = useCallback(
    (ticket: Ticket) => {
      if (selectedTicket?.id === ticket.id) return
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current)
      }
      setIsTicketSwitching(true)
      setSelectedTicket(ticket)
      markTicketViewed(ticket.id)
      switchTimeoutRef.current = setTimeout(() => {
        setIsTicketSwitching(false)
      }, 180)
    },
    [selectedTicket?.id, markTicketViewed],
  )

  // Department + job categories for the open ticket, from real master data.
  const ticketDepartmentCode = resolveDepartmentCode(selectedTicket)
  const ticketDepartment =
    departments.find((d) => d.id === selectedTicket?.departmentId) ||
    departments.find((d) => (d.code || '').toUpperCase() === ticketDepartmentCode)

  const departmentChips =
    departments.length > 0
      ? departments.filter((d) => {
          const code = (d.code || '').toUpperCase()
          if (managerType === 'RNM') return code === 'RNM'
          if (managerType === 'CON') return code === 'CON'
          return ['RNM', 'CON'].includes(code) || d.id === ticketDepartment?.id
        })
      : []

  const jobCategoryChips =
    ticketDepartment?.jobCategories && ticketDepartment.jobCategories.length > 0
      ? ticketDepartment.jobCategories.map((jc) => ({ id: jc.id, name: jc.name }))
      : (FALLBACK_JOB_CATEGORIES[ticketDepartmentCode] || FALLBACK_JOB_CATEGORIES.RNM || []).map((name) => ({
          id: `fallback-${name}`,
          name,
        }))

  const activeCategoryObj = categories.find(
    (c) => c.id === selectedTicket?.categoryId || c.name === selectedTicket?.category,
  )
  const availableSubCategories = activeCategoryObj?.subCategories || []

  // Check if selected ticket is assigned to Self (current logged-in user)
  const isSelfAssigned =
    Boolean(selectedTicket?.assignedToUserId) &&
    (selectedTicket?.assignedToUserId === user?.id ||
      selectedTicket?.assignedToUser?.id === user?.id ||
      selectedTicket?.assignedToUser?.email === user?.email)

  // Helper to determine if ticket is for common area
  const isCommonAreaTicket = (t: Ticket | null | undefined): boolean => {
    if (!t) return false
    if (t.areaType === 'COMMON_AREA') return true
    const combined = `${t.title || ''} ${t.description || ''} ${t.category || ''}`.toLowerCase()
    if (combined.includes('common area') || combined.includes('common-area') || combined.includes('society common'))
      return true
    if (!t.unitId && !t.unit) return true
    return false
  }

  // Helper to format flat / unit display string cleanly without "undefined"
  const formatUnitLabel = (t: Ticket) => {
    if (isCommonAreaTicket(t)) {
      return 'Common Area'
    }
    const uNum = t.unit?.unit_number || t.unit?.unitNumber
    if (uNum) {
      return uNum.includes('-') ? uNum : `A, A-${uNum}`
    }
    if (t.title) {
      const match = t.title.match(/Flat\s+(.+)$/i)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    return 'In-Flat'
  }

  // Helper to format date for stepper timeline
  const formatStepperDate = (dateStr: string | Date) => {
    const d = new Date(dateStr)
    const day = d.getDate()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[d.getMonth()]
    const year = d.getFullYear()
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${day} ${month}, ${year}. ${time}`
  }

  // Active Sub-Category Name helper
  const activeSubCategoryName =
    availableSubCategories.find((s) => s.id === selectedTicket?.subCategoryId)?.name ||
    selectedTicket?.subCategoryObj?.name ||
    'Electrical Maintenance'

  // Assigned Employee Name helper
  const getAssigneeName = (t: Ticket | null) => {
    if (!t) return 'Unassigned'
    if (t.assignedToUser) {
      const name = userDisplayName(t.assignedToUser)
      if (name) return name
    }
    if (t.assignedToUserId) {
      if (user?.id && t.assignedToUserId === user.id) return 'Self'
      return 'Staff Member'
    }
    return 'Unassigned'
  }

  // Staff member who tapped "Start Work" in the L3 app.
  const getWorkStartedByName = (t: Ticket | null) => {
    if (!t) return null
    return userDisplayName(t.workStartedByUser) || null
  }

  // Completed By Employee Name helper
  const getCompletedByName = (t: Ticket | null) => {
    if (!t) return 'Technician'
    if (t.completedByUser) {
      const name = userDisplayName(t.completedByUser)
      if (name) return name
    }
    if (t.completedBy) return t.completedBy
    const compData = parseTicketCompletion(t)
    if (compData?.completedByName) return compData.completedByName
    const assignee = getAssigneeName(t)
    if (assignee && assignee !== 'Unassigned') return assignee
    return 'Technician'
  }

  const assignedName = getAssigneeName(selectedTicket)

  // Completion report, resident attachments and verification state for the detail pane.
  const completion = parseTicketCompletion(selectedTicket)
  const requestMedia = parseTicketRequestMedia(selectedTicket)
  const isTicketVerified = Boolean(selectedTicket?.verifiedAt) || selectedTicket?.status === 'CLOSED'
  const isTicketFeedbackDone = Boolean(selectedTicket?.feedback)
  const isSelectedEscalated = isTicketEscalated(selectedTicket)
  const verifiedByName = userDisplayName(selectedTicket?.verifiedByUser)

  // Check view status mode
  const isClosedView =
    selectedTicket?.status === 'CLOSED' ||
    selectedTicket?.status === 'RESOLVED' ||
    activeTab === 'CLOSED' ||
    activeTab === 'COMPLETED'
  const selectedTicketAny = selectedTicket as unknown as { assignedTo?: unknown }
  const isTicketAssigned = Boolean(
    selectedTicket &&
    ((selectedTicket.assignedToUserId && selectedTicket.assignedToUserId !== 'Unassigned') ||
      selectedTicket.assignedToUser ||
      (selectedTicketAny?.assignedTo &&
        String(selectedTicketAny.assignedTo).toLowerCase() !== 'unassigned' &&
        String(selectedTicketAny.assignedTo).trim() !== '')),
  )
  const isInProgressView =
    !isClosedView &&
    (activeTab === 'IN_PROGRESS' ||
      (selectedTicket &&
        (selectedTicket.status === 'IN_PROGRESS' || selectedTicket.status === 'ON_HOLD' || isTicketAssigned)))

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={Wrench}
        title="Tickets"
        description="Manage service tickets, assign personnel, and update ticket resolution options."
        actions={
          <>
            {canCreateTicket && (
              <Button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#005390] hover:bg-[#004273] text-white text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs h-auto"
              >
                <Plus className="w-4 h-4" /> Add New Ticket
              </Button>
            )}

            {/* {canUpdateTicket && (
              <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-xs font-semibold text-gray-700">Automate Tickets</span>
                <Switch
                  checked={automateTickets}
                  onCheckedChange={setAutomateTickets}
                  aria-label="Toggle automate tickets"
                  className="data-checked:bg-[#005390]"
                />
              </div>
            )} */}
          </>
        }
      />

      {/* Main Workspace Layout */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[520px]">
        {/* Left Column: Tickets Queue List (4 cols) */}
        <Card className="gap-0 lg:col-span-4 bg-white rounded-2xl border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-13rem)] min-h-[520px]">
          {/* Tab Filter Header with Primary Brand Blue */}
          <div className="relative z-30 p-2 border-b border-gray-100 bg-gray-50/50">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                const nextTab = val as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED'
                if (nextTab !== activeTab) {
                  setIsLoading(true)
                  setSelectedTicket(null)
                  setActiveTab(nextTab)
                }
              }}
              className="w-full gap-0"
            >
              <div className="rounded-2xl bg-card text-card-foreground/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] border border-gray-100/80">
                <TabsList className="grid grid-cols-4 w-full h-auto p-0 bg-transparent gap-1">
                  {(
                    [
                      { value: 'OPEN', label: 'Open' },
                      { value: 'IN_PROGRESS', label: 'In Progress' },
                      { value: 'COMPLETED', label: 'Completed' },
                      { value: 'CLOSED', label: 'Closed' },
                    ] as const
                  ).map(({ value, label }) => {
                    const isCurrent = activeTab === value
                    return (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="flex h-8 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-white dark:text-gray-300 dark:hover:text-white dark:hover:bg-slate-800 [&[data-active]]:!bg-[#005390] [&[data-active]]:!text-white [&[data-active]:hover]:!bg-[#005390] [&[data-active]:hover]:!text-white data-active:shadow-sm focus-visible:!ring-0 transition-all duration-200 cursor-pointer"
                      >
                        {isLoading && isCurrent && <Loader2 className="w-3 h-3 animate-spin shrink-0 text-white" />}
                        <span>{label}</span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>
            </Tabs>
          </div>

          {/* Tickets Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 flex flex-col">
            {isLoading ? (
              <TicketScreenLoader
                title="Loading tickets..."
                subtitle={`Fetching ${activeTab.toLowerCase().replace('_', ' ')} queue...`}
              />
            ) : displayTickets.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                <TicketIcon className="w-10 h-10 mb-2 text-gray-300 stroke-[1.5]" />
                <span className="text-sm font-bold text-gray-600">No tickets in this section</span>
                <span className="text-xs text-gray-400 mt-1">
                  There are currently no {activeTab.toLowerCase().replace('_', ' ')} tickets.
                </span>
              </div>
            ) : (
              displayTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id
                const isCommon = isCommonAreaTicket(t)
                const unitStr = formatUnitLabel(t)
                const itemAssignee = getAssigneeName(t)
                const isItemSelf =
                  Boolean(t.assignedToUserId) &&
                  (t.assignedToUserId === user?.id ||
                    t.assignedToUser?.id === user?.id ||
                    t.assignedToUser?.email === user?.email ||
                    itemAssignee === 'Self')
                const ticketTimestamp =
                  activeTab === 'CLOSED' ||
                  activeTab === 'COMPLETED' ||
                  t.status === 'CLOSED' ||
                  t.status === 'RESOLVED'
                    ? t.completedAt || t.closedAt || t.resolvedAt || t.verifiedAt || t.createdAt
                    : t.createdAt

                return (
                  <Button
                    key={t.id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleSelectTicket(t)}
                    className={cn(
                      'w-full text-left justify-start items-stretch flex flex-col h-auto p-4 transition-all duration-150 cursor-pointer relative rounded-none border-b border-gray-100 last:border-b-0 whitespace-normal font-normal',
                      isSelected
                        ? 'bg-[#005390] text-white hover:bg-[#005390] hover:text-white shadow-2xs'
                        : 'bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold tracking-tight">{t.ticketNumber}</span>
                        {t.status === 'OPEN' && !viewedTicketIds.has(t.id) && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                              isSelected
                                ? 'bg-amber-200 text-amber-950 shadow-2xs'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            New
                          </span>
                        )}
                        {isCommon && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                              isSelected
                                ? 'bg-purple-200 text-purple-950 shadow-2xs'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            Common Area
                          </span>
                        )}
                        {isTicketEscalated(t) && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 ${
                              isSelected
                                ? 'bg-red-200 text-red-950 shadow-2xs'
                                : 'bg-red-100 text-red-700 border border-red-200'
                            }`}
                          >
                            <ArrowUpCircle className="w-2.5 h-2.5" />
                            Escalated
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] flex items-center gap-1 shrink-0 ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}
                      >
                        <Clock className="w-3 h-3" />
                        {formatTicketDateTime(ticketTimestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                      <div
                        className={`flex items-center gap-1.5 ${
                          isSelected ? 'text-gray-200' : isCommon ? 'text-purple-700' : 'text-gray-600'
                        }`}
                      >
                        {isCommon ? (
                          <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-200' : 'text-purple-600'}`} />
                        ) : (
                          <Home className="w-3.5 h-3.5" />
                        )}
                        <span
                          className={
                            isCommon ? (isSelected ? 'font-bold text-white' : 'font-bold text-purple-700') : ''
                          }
                        >
                          {unitStr}
                        </span>
                      </div>

                      {activeTab === 'CLOSED' ||
                      activeTab === 'COMPLETED' ||
                      t.status === 'CLOSED' ||
                      t.status === 'RESOLVED' ? (
                        <span
                          className={`text-[10px] font-bold ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`}
                        >
                          Completed by {getCompletedByName(t)}
                        </span>
                      ) : t.assignedToUserId || t.assignedToUser ? (
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-200' : 'text-blue-600'}`}>
                          {isItemSelf ? 'Self' : `Assigned to ${itemAssignee}`}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-200' : 'text-amber-600'}`}>
                          Unassigned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className={`text-xs truncate font-medium ${isSelected ? 'text-gray-100' : 'text-gray-500'}`}>
                        <MessageSquare className="w-3 h-3 inline mr-1 opacity-70" />
                        {t.title || t.description || 'Service Ticket'}
                      </div>

                      {/* Work start state from the L3 staff app, shown while the ticket is being worked on */}
                      {(t.assignedToUserId || t.assignedToUser) &&
                        !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status) &&
                        (t.workStartedAt ? (
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isSelected ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            Work Started
                          </span>
                        ) : (
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isSelected ? 'bg-amber-400/20 text-amber-100' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            Not Started
                          </span>
                        ))}
                    </div>
                  </Button>
                )
              })
            )}
          </div>
        </Card>

        {/* Right Column: Ticket Workspace Detail (8 cols) */}
        <Card className="gap-0 lg:col-span-8 bg-white rounded-2xl border-gray-200 shadow-sm p-6 h-[calc(100vh-13rem)] min-h-[520px] relative flex flex-col overflow-y-auto">
          {isLoading || isTicketSwitching ? (
            <TicketScreenLoader
              title={isLoading ? 'Loading ticket details...' : 'Switching ticket...'}
              subtitle={isLoading ? 'Retrieving service requests & status...' : 'Updating workspace details...'}
            />
          ) : selectedTicket ? (
            isClosedView ? (
              /* CLOSED TICKET VIEW MATCHING SCREENSHOT */
              <div className="space-y-6 flex-1">
                {/* Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                      <TicketIcon className="w-5 h-5 text-[#005390]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-mono font-extrabold text-gray-900">
                        {selectedTicket.ticketNumber}
                      </span>
                      {isCommonAreaTicket(selectedTicket) && (
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs">
                          <Building2 className="w-3.5 h-3.5 text-purple-600" />
                          Common Area
                        </span>
                      )}
                      {isSelectedEscalated && (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs">
                          <ArrowUpCircle className="w-3.5 h-3.5 text-red-600" />
                          Escalated
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold ${
                      isTicketVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {isTicketVerified ? 'Verified & Closed' : 'Completed'}
                  </span>
                </div>

                {/* Progress Stepper Box matching screenshot */}
                <div className="border border-dashed border-gray-300 rounded-2xl p-6 bg-white shadow-2xs space-y-4">
                  <div className="grid grid-cols-6 relative">
                    {/* Progress Bar Line — six steps, so the line runs between the 1st and 6th centres */}
                    <div className="absolute top-4 -translate-y-1/2 left-[8.333%] right-[8.333%] h-0.5 bg-gray-200 z-0" />
                    <div
                      className="absolute top-4 -translate-y-1/2 left-[8.333%] h-0.5 bg-emerald-500 z-0 transition-all duration-300"
                      style={{
                        width: `${((isTicketFeedbackDone ? 5 : isTicketVerified ? 4 : 3) / 5) * 83.333}%`,
                      }}
                    />

                    {/* Step 1: Request Raised */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center px-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Request Raised</span>
                      <span className="text-[10px] font-medium text-gray-500 leading-tight">
                        Request raised at {formatStepperDate(selectedTicket.createdAt)}
                      </span>
                    </div>

                    {/* Step 2: Assigned Task */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center px-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Assigned Task</span>
                      <span className="text-[10px] font-medium text-gray-500 leading-tight">
                        Task assigned to staff
                      </span>
                    </div>

                    {/* Step 3: Work Started (L3 staff tapped "Start Work") */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center px-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Work Started</span>
                      <span className="text-[10px] font-medium text-gray-500 leading-tight">
                        {selectedTicket.workStartedAt
                          ? `Started${getWorkStartedByName(selectedTicket) ? ` by ${getWorkStartedByName(selectedTicket)}` : ''} at ${formatStepperDate(selectedTicket.workStartedAt)}`
                          : 'Work started by staff'}
                      </span>
                    </div>

                    {/* Step 3: Task Completed */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center px-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-900">Task Completed</span>
                      <span className="text-[10px] font-medium text-gray-500 leading-tight">
                        {completion?.completedAt
                          ? `Work completed ${formatStepperDate(completion.completedAt)}`
                          : 'Work completed by staff'}
                      </span>
                    </div>

                    {/* Step 4: Verified */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center px-1">
                      <div
                        className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shadow-2xs ${
                          isTicketVerified
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-gray-300 bg-white text-gray-400'
                        }`}
                      >
                        {isTicketVerified ? <Check className="w-4.5 h-4.5" /> : <ShieldCheck className="w-4 h-4" />}
                      </div>
                      <span className={`text-xs font-bold ${isTicketVerified ? 'text-gray-900' : 'text-gray-400'}`}>
                        Verified
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 leading-tight">
                        {isTicketVerified
                          ? `Verified${verifiedByName ? ` by ${verifiedByName}` : ''}${
                              selectedTicket.verifiedAt ? ` at ${formatStepperDate(selectedTicket.verifiedAt)}` : ''
                            }`
                          : 'Awaiting admin verification'}
                      </span>
                    </div>

                    {/* Step 5: Feedback */}
                    <div className="flex flex-col items-center z-10 space-y-1.5 text-center px-1">
                      <div
                        className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shadow-2xs ${
                          isTicketFeedbackDone
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-gray-300 bg-white text-gray-400'
                        }`}
                      >
                        {isTicketFeedbackDone ? (
                          <Check className="w-4.5 h-4.5" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-xs font-bold ${isTicketFeedbackDone ? 'text-gray-900' : 'text-gray-400'}`}>
                        Feedback
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 leading-tight">
                        {isTicketFeedbackDone && selectedTicket.feedback
                          ? `${FEEDBACK_RATING_LABELS[selectedTicket.feedback.rating] || selectedTicket.feedback.rating} rating${
                              selectedTicket.feedback.createdAt
                                ? ` at ${formatStepperDate(selectedTicket.feedback.createdAt)}`
                                : ''
                            }`
                          : 'Awaiting resident feedback'}
                      </span>
                    </div>
                  </div>

                  {/* Verify action / verified confirmation */}
                  {isTicketVerified ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-800">
                        Work verified{verifiedByName ? ` by ${verifiedByName}` : ''}
                        {selectedTicket.verifiedAt ? ` on ${new Date(selectedTicket.verifiedAt).toLocaleString()}` : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5">
                      <span className="text-xs font-semibold text-amber-900">
                        Review the resident request and the staff completion report below, then verify.
                      </span>
                      <Button
                        type="button"
                        onClick={handleVerifyTicket}
                        disabled={verifying}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex-shrink-0 h-auto"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {verifying ? 'Verifying…' : 'Verify & Close Ticket'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Metadata Section */}
                <div className="space-y-3 pt-2 text-sm text-gray-800">
                  <div className="flex items-center gap-2 font-bold text-gray-900">
                    {isCommonAreaTicket(selectedTicket) ? (
                      <>
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-700 font-bold">Common Area</span>
                      </>
                    ) : (
                      <>
                        <Home className="w-4 h-4 text-gray-800" />
                        <span>{formatUnitLabel(selectedTicket)}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Department :</span>
                    <span className="font-bold text-gray-900">
                      {selectedTicket.department?.name || selectedTicket.category || 'General Service'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Category :</span>
                    <span className="font-bold text-gray-900">
                      {selectedTicket.category || 'Rely Advantage Service'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Sub Category :</span>
                    <span className="font-bold text-gray-900">{activeSubCategoryName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Raised By :</span>
                    <RaisedBy ticket={selectedTicket} />
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-gray-500 font-semibold">Completed By :</span>
                    <span className="font-bold text-emerald-700">{getCompletedByName(selectedTicket)}</span>
                  </div>

                  {selectedTicket.tatUpdatedBy && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-500 font-semibold">TAT Updated By :</span>
                      <span className="font-bold text-blue-900">{selectedTicket.tatUpdatedBy}</span>
                    </div>
                  )}

                  {isSelectedEscalated && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-gray-500 font-semibold">Escalated By :</span>
                          <span className="font-bold text-red-700">
                            {escalatedByLabel(selectedTicket) || 'Resident'}
                          </span>
                          {selectedTicket.escalatedAt && (
                            <span className="text-[11px] text-gray-500 font-medium">
                              on {new Date(selectedTicket.escalatedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {selectedTicket.escalationReason && (
                          <p className="text-xs font-medium text-gray-700">Reason: {selectedTicket.escalationReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Readonly Description Box */}
                <div className="pt-2">
                  <Textarea
                    rows={2}
                    readOnly
                    value={selectedTicket.title || selectedTicket.description || 'Hello'}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus-visible:outline-none focus-visible:ring-0 resize-none shadow-2xs"
                  />
                </div>

                {/* Resident's request: photos and voice notes attached when raising the ticket */}
                {requestMedia && (
                  <Card className="gap-0 rounded-2xl border-blue-200/80 bg-gradient-to-b from-blue-50/40 via-white to-blue-50/20 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 border-b border-blue-100 pb-3">
                      <div className="p-2 rounded-xl bg-blue-100 text-[#005390]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-gray-900 tracking-wide uppercase">
                          Resident Request Attachments
                        </h3>
                        <p className="text-[10px] text-gray-500 font-medium">
                          Shared by the resident when raising this ticket
                        </p>
                      </div>
                    </div>

                    {requestMedia.audioUrls.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-[#005390]" />
                          Resident Voice Note{requestMedia.audioUrls.length > 1 ? 's' : ''} (
                          {requestMedia.audioUrls.length})
                        </span>
                        <div className="space-y-2">
                          {requestMedia.audioUrls.map((audioUrl, idx) => (
                            <div
                              key={`${audioUrl}-${idx}`}
                              className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3"
                            >
                              <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                                <Volume2 className="w-4 h-4" />
                              </div>
                              <audio controls src={audioUrl} className="w-full h-8" preload="metadata">
                                <track kind="captions" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {requestMedia.photos.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                          Resident Photos ({requestMedia.photos.length})
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                          {requestMedia.photos.map((photoUrl, idx) => (
                            <Button
                              type="button"
                              variant="ghost"
                              key={`${photoUrl}-${idx}`}
                              className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-2xs aspect-video cursor-pointer bg-gray-100 p-0 text-left w-full h-auto block hover:bg-gray-100"
                              onClick={() => setPreviewMediaUrl(photoUrl)}
                            >
                              <img
                                src={photoUrl}
                                alt={`Resident attachment ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-5 h-5" />
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Work Resolution & Completion Section (Invoice, Voice Note, Photos, Notes) */}
                {(() => {
                  const completionData = completion
                  if (!completionData) return null

                  return (
                    <Card className="gap-0 rounded-2xl border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 via-white to-emerald-50/20 p-5 space-y-4 shadow-2xs">
                      {/* Header with completion banner & invoice amount */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-extrabold text-gray-900 tracking-wide uppercase">
                              Work Resolution & Completion Report
                            </h3>
                            {completionData.completedAt && (
                              <p className="text-[10px] text-gray-500 font-medium">
                                Resolved at {new Date(completionData.completedAt).toLocaleString()}
                                {completionData.completedByName ? ` by ${completionData.completedByName}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        {completionData.amount !== null && completionData.amount !== undefined && (
                          <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
                            <span className="text-[11px] font-semibold text-emerald-100">Invoice Amount:</span>
                            <span className="text-sm font-black flex items-center font-mono">
                              <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                              {typeof completionData.amount === 'number'
                                ? completionData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                : completionData.amount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 1. Technician Resolution Note */}
                      {completionData.notes && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            Resolution Note
                          </span>
                          <div className="p-3.5 bg-white rounded-xl border border-gray-200 text-xs font-medium text-gray-800 leading-relaxed shadow-2xs whitespace-pre-line">
                            {completionData.notes}
                          </div>
                        </div>
                      )}

                      {/* 2. Voice Recording Audio Players */}
                      {completionData.audioUrls.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-[#005390]" />
                            Staff Voice Note{completionData.audioUrls.length > 1 ? 's' : ''} (
                            {completionData.audioUrls.length})
                          </span>
                          <div className="space-y-2">
                            {completionData.audioUrls.map((audioUrl, idx) => (
                              <div
                                key={`${audioUrl}-${idx}`}
                                className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3"
                              >
                                <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                                  <Volume2 className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <audio controls src={audioUrl} className="w-full h-8" preload="metadata">
                                    <track kind="captions" />
                                    Your browser does not support the audio element.
                                  </audio>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Invoice Document & Invoice Photo */}
                      {completionData.invoiceUrl && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-amber-600" />
                            Invoice Document / Bill Copy
                          </span>
                          <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setPreviewMediaUrl(completionData.invoiceUrl)}
                                className="w-14 h-14 rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity shadow-2xs p-0 bg-transparent flex-shrink-0"
                              >
                                <img
                                  src={completionData.invoiceUrl}
                                  alt="Invoice Preview"
                                  className="w-full h-full object-cover"
                                />
                              </Button>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-gray-900 truncate">
                                  {completionData.invoiceNumber
                                    ? `Invoice #${completionData.invoiceNumber}`
                                    : 'Invoice Document'}
                                </h4>
                                <p className="text-[10px] text-gray-500 mt-0.5">Click to preview full invoice bill</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewMediaUrl(completionData.invoiceUrl)}
                              className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors h-auto"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-500" /> View Invoice
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 4. Work Completion Photos */}
                      {completionData.photos && completionData.photos.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                            Work Completion Photos ({completionData.photos.length})
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                            {completionData.photos.map((photoUrl, idx) => (
                              <Button
                                type="button"
                                variant="ghost"
                                key={idx}
                                className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-2xs aspect-video cursor-pointer bg-gray-100 p-0 text-left w-full h-auto block hover:bg-gray-100"
                                onClick={() => setPreviewMediaUrl(photoUrl)}
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Completion work ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-5 h-5" />
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })()}

                {/* Resident Feedback on the completed work */}
                {selectedTicket.feedback && (
                  <Card className="gap-0 bg-white rounded-2xl border-gray-200/80 p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-extrabold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#005390]" />
                        Resident Feedback
                      </h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          FEEDBACK_RATING_STYLES[selectedTicket.feedback.rating] || FEEDBACK_RATING_STYLES.AVERAGE
                        }`}
                      >
                        {FEEDBACK_RATING_LABELS[selectedTicket.feedback.rating] || selectedTicket.feedback.rating}
                      </span>
                    </div>

                    {selectedTicket.feedback.comment && (
                      <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-line">
                        {selectedTicket.feedback.comment}
                      </p>
                    )}

                    <div className="text-[10px] font-semibold text-gray-400">
                      {describeFeedbackAuthor(selectedTicket.feedback)}
                      {selectedTicket.feedback.createdAt
                        ? ` · ${new Date(selectedTicket.feedback.createdAt).toLocaleString()}`
                        : ''}
                    </div>
                  </Card>
                )}
              </div>
            ) : isInProgressView ? (
              /* IN PROGRESS EXECUTION VIEW MATCHING DESIGN SYSTEM */
              <div className="space-y-6 flex-1">
                {/* Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                      <TicketIcon className="w-5 h-5 text-[#005390]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-mono font-extrabold text-gray-900">
                        {selectedTicket.ticketNumber}
                      </span>
                      {isCommonAreaTicket(selectedTicket) && (
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs">
                          <Building2 className="w-3.5 h-3.5 text-purple-600" />
                          Common Area
                        </span>
                      )}
                      {isSelectedEscalated && (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs">
                          <ArrowUpCircle className="w-3.5 h-3.5 text-red-600" />
                          Escalated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge Dropdown */}
                  <Select value={selectedTicket.status} onValueChange={(val) => setPendingStatus(val as TicketStatus)}>
                    <SelectTrigger className="px-3 py-1.5 bg-amber-50/90 text-amber-800 border border-amber-200 rounded-xl text-xs font-extrabold shadow-2xs h-auto w-auto">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Completed</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Progress Stepper Tracker Box styled with primary brand blue */}
                <div className="border border-dashed border-gray-300 rounded-2xl p-6 bg-white shadow-2xs space-y-4">
                  {(() => {
                    const ticketAny = selectedTicket as unknown as { assignedTo?: unknown }
                    const hasAssignedStaff = Boolean(
                      (selectedTicket.assignedToUserId &&
                        selectedTicket.assignedToUserId !== 'Unassigned' &&
                        String(selectedTicket.assignedToUserId).trim() !== '') ||
                      selectedTicket.assignedToUser ||
                      (ticketAny?.assignedTo &&
                        String(ticketAny.assignedTo).toLowerCase() !== 'unassigned' &&
                        String(ticketAny.assignedTo).trim() !== ''),
                    )

                    const isStep2Done = Boolean(
                      hasAssignedStaff ||
                      selectedTicket.status === 'IN_PROGRESS' ||
                      selectedTicket.status === 'ON_HOLD' ||
                      selectedTicket.status === 'RESOLVED' ||
                      selectedTicket.status === 'CLOSED',
                    )
                    const isStep3Done = selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED'
                    // Set only when the assigned staff member taps "Start Work" in the L3 app.
                    const isWorkStarted = Boolean(selectedTicket.workStartedAt) || isStep3Done
                    const isStep4Done = isTicketVerified
                    const isStep5Done = isTicketFeedbackDone
                    const workStartedBy = getWorkStartedByName(selectedTicket)

                    const stepIndex =
                      isStep5Done && isStep4Done
                        ? 5
                        : isStep4Done
                          ? 4
                          : isStep3Done
                            ? 3
                            : isWorkStarted
                              ? 2
                              : isStep2Done
                                ? 1
                                : 0
                    const activeWidthPercent = (stepIndex / 5) * 83.333

                    return (
                      <div className="grid grid-cols-6 relative">
                        {/* Background Progress Line */}
                        <div className="absolute top-4 -translate-y-1/2 left-[8.333%] right-[8.333%] h-0.5 bg-gray-200 z-0" />
                        {/* Active Progress Line */}
                        <div
                          className="absolute top-4 -translate-y-1/2 left-[8.333%] h-0.5 bg-[#005390] transition-all duration-300 z-0"
                          style={{ width: `${activeWidthPercent}%` }}
                        />

                        {/* Step 1: Request Raised */}
                        <div className="flex flex-col items-center z-10 space-y-2 text-center px-1">
                          <div className="w-8 h-8 rounded-full border-2 border-[#005390] bg-[#005390] text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                            <Check className="w-4.5 h-4.5" />
                          </div>
                          <span className="text-xs font-bold text-gray-900">Request Raised</span>
                        </div>

                        {/* Step 2: Assigned Task */}
                        <div className="flex flex-col items-center z-10 space-y-2 text-center px-1">
                          <div
                            className={`w-8 h-8 rounded-full border-2 ${
                              isStep2Done
                                ? 'border-[#005390] bg-[#005390] text-white'
                                : 'border-gray-300 bg-white text-gray-400'
                            } font-bold flex items-center justify-center text-xs shadow-2xs`}
                          >
                            {isStep2Done ? (
                              <Check className="w-4.5 h-4.5" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                            )}
                          </div>
                          <span className={`text-xs font-bold ${isStep2Done ? 'text-gray-900' : 'text-gray-400'}`}>
                            Assigned Task
                          </span>
                        </div>

                        {/* Step 3: Work Started */}
                        <div className="flex flex-col items-center z-10 space-y-2 text-center px-1">
                          <div
                            className={`w-8 h-8 rounded-full border-2 ${
                              isWorkStarted
                                ? 'border-[#005390] bg-[#005390] text-white'
                                : 'border-gray-300 bg-white text-gray-400'
                            } font-bold flex items-center justify-center text-xs shadow-2xs`}
                          >
                            {isWorkStarted ? (
                              <Check className="w-4.5 h-4.5" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                            )}
                          </div>
                          <span className={`text-xs font-bold ${isWorkStarted ? 'text-gray-900' : 'text-gray-400'}`}>
                            Work Started
                          </span>
                          {selectedTicket.workStartedAt ? (
                            <span className="text-[10px] font-medium text-gray-500 leading-tight">
                              {workStartedBy ? `By ${workStartedBy}, ` : ''}
                              {formatStepperDate(selectedTicket.workStartedAt)}
                            </span>
                          ) : isStep2Done && !isStep3Done ? (
                            <span className="text-[10px] font-medium text-amber-600 leading-tight">
                              Waiting for staff to start
                            </span>
                          ) : null}
                        </div>

                        {/* Step 3: Task Completed */}
                        <div className="flex flex-col items-center z-10 space-y-2 text-center px-1">
                          <div
                            className={`w-8 h-8 rounded-full border-2 ${
                              isStep3Done
                                ? 'border-[#005390] bg-[#005390] text-white'
                                : 'border-gray-300 bg-white text-gray-400'
                            } font-bold flex items-center justify-center text-xs shadow-2xs`}
                          >
                            {isStep3Done ? (
                              <Check className="w-4.5 h-4.5" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                            )}
                          </div>
                          <span className={`text-xs font-bold ${isStep3Done ? 'text-gray-900' : 'text-gray-400'}`}>
                            Task Completed
                          </span>
                        </div>

                        {/* Step 4: Verified */}
                        <div className="flex flex-col items-center z-10 space-y-2 text-center px-1">
                          <div
                            className={`w-8 h-8 rounded-full border-2 ${
                              isStep4Done
                                ? 'border-[#005390] bg-[#005390] text-white'
                                : 'border-gray-300 bg-white text-gray-400'
                            } font-bold flex items-center justify-center text-xs shadow-2xs`}
                          >
                            {isStep4Done ? (
                              <Check className="w-4.5 h-4.5" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                            )}
                          </div>
                          <span className={`text-xs font-bold ${isStep4Done ? 'text-gray-900' : 'text-gray-400'}`}>
                            Verified
                          </span>
                        </div>

                        {/* Step 5: Feedback */}
                        <div className="flex flex-col items-center z-10 space-y-2 text-center px-1">
                          <div
                            className={`w-8 h-8 rounded-full border-2 ${
                              isStep5Done
                                ? 'border-[#005390] bg-[#005390] text-white'
                                : 'border-gray-300 bg-white text-gray-400'
                            } font-bold flex items-center justify-center text-xs shadow-2xs`}
                          >
                            {isStep5Done ? (
                              <Check className="w-4.5 h-4.5" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                            )}
                          </div>
                          <span className={`text-xs font-bold ${isStep5Done ? 'text-gray-900' : 'text-gray-400'}`}>
                            Feedback
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Resident Note, Voice Recording, and Attached Images */}
                {(() => {
                  const media = parseTicketMedia(selectedTicket)
                  if (!media.notes && !media.audioUrl && media.photos.length === 0) return null

                  return (
                    <div className="space-y-4 pt-1">
                      {/* Resident Note Message */}
                      {media.notes && (
                        <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                            <span>Resident Note / Message</span>
                          </div>
                          <p className="text-xs font-medium text-gray-800 leading-relaxed whitespace-pre-line">
                            {media.notes}
                          </p>
                        </div>
                      )}

                      {/* Voice Note Audio Recording */}
                      {media.audioUrl && (
                        <div className="p-4 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 border border-blue-200/90 rounded-xl space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <Mic className="w-4 h-4 text-[#005390]" />
                              Voice Note Recording
                            </span>
                            <span className="text-[10px] font-bold text-[#005390] bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                              Audio Note
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50 text-[#005390]">
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <audio controls src={media.audioUrl} className="w-full h-8" preload="metadata">
                                <track kind="captions" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attached Images / Photos */}
                      {media.photos.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-3 py-1 rounded-md inline-flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                              Attached Images ({media.photos.length})
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">Click image to preview</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                            {media.photos.map((photoUrl: string, idx: number) => (
                              <Button
                                type="button"
                                variant="ghost"
                                key={idx}
                                className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-2xs aspect-video cursor-pointer bg-gray-100 p-0 text-left w-full h-auto block hover:bg-gray-100"
                                onClick={() => setPreviewMediaUrl(photoUrl)}
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Ticket attachment ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-5 h-5" />
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Detail Metadata List */}
                <div className="space-y-4 pt-2 text-sm text-gray-800">
                  <div className="flex items-center gap-2 font-bold text-gray-900">
                    {isCommonAreaTicket(selectedTicket) ? (
                      <>
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-700 font-bold">Common Area</span>
                      </>
                    ) : (
                      <>
                        <Home className="w-4 h-4 text-gray-800" />
                        <span>{formatUnitLabel(selectedTicket)}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Department :</span>
                    <span className="font-bold text-gray-900">
                      {selectedTicket.department?.name || selectedTicket.category || 'General Service'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Category :</span>
                    <span className="font-bold text-gray-900">{selectedTicket.category || 'R&M (Repair)'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Sub Category :</span>
                    <span className="font-bold text-gray-900">{activeSubCategoryName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Raised By :</span>
                    <RaisedBy ticket={selectedTicket} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">TAT :</span>
                    <span className="font-bold text-gray-900">{selectedTicket.tatOption || '1-2 hour'}</span>
                    {canUpdateTicket && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setIsTatModalOpen(true)}
                        className="text-[#005390] hover:underline font-bold text-xs cursor-pointer ml-2 p-0 h-auto"
                      >
                        Change TAT
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-700" />
                    <span className="text-gray-500 font-semibold">Assigned :</span>
                    <span className="font-bold text-gray-900">{assignedName}</span>
                    {canUpdateTicket && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setIsAssignDrawerOpen(true)}
                        className="text-[#005390] hover:underline font-bold text-xs cursor-pointer ml-2 p-0 h-auto"
                      >
                        Change Assignee
                      </Button>
                    )}
                  </div>
                </div>

                {/* Add Invoice Details CTA Button styled with primary color */}
                {canUpdateTicket && (
                  <div className="pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInvoiceModalOpen(true)}
                      className="w-full py-3.5 h-auto border-2 border-[#005390] text-[#005390] hover:bg-blue-50/60 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs"
                    >
                      <Plus className="w-4 h-4" /> Add Invoice Details
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* OPEN TICKET CREATION / OPTION SELECTOR VIEW */
              <div className="space-y-6 flex-1">
                {/* Header Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-extrabold font-mono text-gray-900">
                        {selectedTicket.ticketNumber}
                      </span>
                      {isCommonAreaTicket(selectedTicket) && (
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs">
                          <Building2 className="w-3.5 h-3.5 text-purple-600" />
                          Common Area
                        </span>
                      )}
                      {isSelectedEscalated && (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-black flex items-center gap-1 shadow-2xs">
                          <ArrowUpCircle className="w-3.5 h-3.5 text-red-600" />
                          Escalated
                        </span>
                      )}
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(val) => setPendingStatus(val as TicketStatus)}
                        disabled={!canUpdateTicket}
                      >
                        <SelectTrigger
                          className={`px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs font-bold h-auto w-auto ${
                            !canUpdateTicket ? 'cursor-not-allowed opacity-75' : ''
                          }`}
                        >
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="RESOLVED">Completed</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>

                      {isSelfAssigned && (
                        <span className="px-2.5 py-1 bg-blue-50 text-[#005390] border border-blue-200 rounded-lg text-xs font-bold">
                          Self Assigned
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mt-1">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {isCommonAreaTicket(selectedTicket) ? (
                          <>
                            <Building2 className="w-3.5 h-3.5 text-purple-600" />
                            <span className="text-purple-700 font-bold">Common Area</span>
                          </>
                        ) : (
                          <>
                            <Home className="w-3.5 h-3.5 text-gray-400" />
                            <span>{formatUnitLabel(selectedTicket)}</span>
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatTicketDateTime(selectedTicket.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Issue Title & Summary */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                    Issue / Service
                  </span>
                  <p className="text-sm font-bold text-gray-900 leading-snug">
                    {selectedTicket.title || selectedTicket.category || 'Service Ticket'}
                  </p>
                </div>

                {/* Resident Note, Voice Recording, and Attached Images */}
                {(() => {
                  const media = parseTicketMedia(selectedTicket)
                  return (
                    <div className="space-y-4">
                      {/* Resident Note Message */}
                      {media.notes && (
                        <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                            <span>Resident Note / Message</span>
                          </div>
                          <p className="text-xs font-medium text-gray-800 leading-relaxed whitespace-pre-line">
                            {media.notes}
                          </p>
                        </div>
                      )}

                      {/* Voice Note Audio Recording */}
                      {media.audioUrl && (
                        <div className="p-4 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 border border-blue-200/90 rounded-xl space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <Mic className="w-4 h-4 text-[#005390]" />
                              Voice Note Recording
                            </span>
                            <span className="text-[10px] font-bold text-[#005390] bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                              Audio Note
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50 text-[#005390]">
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <audio controls src={media.audioUrl} className="w-full h-8" preload="metadata">
                                <track kind="captions" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attached Images / Photos */}
                      {media.photos.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-3 py-1 rounded-md inline-flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                              Attached Images ({media.photos.length})
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">Click image to preview</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                            {media.photos.map((photoUrl: string, idx: number) => (
                              <Button
                                type="button"
                                variant="ghost"
                                key={idx}
                                className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-2xs aspect-video cursor-pointer bg-gray-100 p-0 text-left w-full h-auto block hover:bg-gray-100"
                                onClick={() => setPreviewMediaUrl(photoUrl)}
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Ticket attachment ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-5 h-5" />
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Department Section */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-md inline-block">
                    Department
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(departmentChips.length > 0
                      ? departmentChips.map((d) => ({ id: d.id, name: d.name, code: (d.code || '').toUpperCase() }))
                      : [
                          { id: 'RNM', name: 'Repair & Maintenance', code: 'RNM' },
                          { id: 'CON', name: 'Concierge', code: 'CON' },
                        ]
                    ).map((dept) => {
                      const isSelected =
                        (selectedTicket.departmentId && selectedTicket.departmentId === dept.id) ||
                        dept.code === ticketDepartmentCode

                      return (
                        <Button
                          key={dept.id}
                          type="button"
                          variant="ghost"
                          disabled
                          className={cn(
                            'px-4 py-2 h-auto rounded-xl text-xs font-bold transition-all cursor-not-allowed',
                            isSelected
                              ? 'bg-[#005390] text-white hover:bg-[#005390] hover:text-white shadow-2xs'
                              : 'bg-gray-100/70 text-gray-400 opacity-60 hover:bg-gray-100/70',
                          )}
                        >
                          {dept.name}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Sub Category Pills (Job Categories) */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-md inline-block">
                    Sub Category / Job Category
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {jobCategoryChips.map((sub) => {
                      const tRecord = selectedTicket as unknown as Record<string, unknown>
                      const jobCatName =
                        selectedTicket.jobCategory?.name ||
                        (typeof tRecord.jobCategory === 'string' ? tRecord.jobCategory : '') ||
                        (typeof tRecord.subCategory === 'string' ? tRecord.subCategory : '') ||
                        selectedTicket.subCategoryObj?.name ||
                        activeSubCategoryName ||
                        ''

                      // Prefer the stored id; fall back to the name for older tickets.
                      const isSelected =
                        selectedTicket.jobCategoryId === sub.id ||
                        selectedTicket.subCategoryId === sub.id ||
                        (Boolean(jobCatName) && jobCatName.toLowerCase() === sub.name.toLowerCase()) ||
                        (Boolean(jobCatName) && jobCatName.toLowerCase().includes(sub.name.toLowerCase())) ||
                        Boolean(
                          selectedTicket.title && selectedTicket.title.toLowerCase().includes(sub.name.toLowerCase()),
                        )

                      return (
                        <Button
                          key={sub.id}
                          type="button"
                          variant="ghost"
                          disabled
                          className={cn(
                            'px-4 py-2 h-auto rounded-xl text-xs font-bold transition-all cursor-not-allowed',
                            isSelected
                              ? 'bg-[#005390] text-white hover:bg-[#005390] hover:text-white shadow-2xs'
                              : 'bg-gray-100/70 text-gray-400 opacity-60 hover:bg-gray-100/70',
                          )}
                        >
                          {sub.name}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Priority Pills */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-md inline-block">
                    Priority
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'CRITICAL', label: 'Critical' },
                      { key: 'HIGH', label: 'High' },
                      { key: 'MEDIUM', label: 'Medium' },
                      { key: 'LOW', label: 'Low' },
                    ].map((p) => {
                      const isSelected = selectedTicket.priority === p.key

                      return (
                        <Button
                          key={p.key}
                          type="button"
                          variant="ghost"
                          disabled={!canUpdateTicket}
                          onClick={() => canUpdateTicket && handleUpdateOption({ priority: p.key as TicketPriority })}
                          className={cn(
                            'px-4 py-2 h-auto rounded-xl text-xs font-bold transition-all',
                            canUpdateTicket ? 'cursor-pointer' : 'cursor-not-allowed',
                            isSelected
                              ? 'bg-[#005390] text-white hover:bg-[#005390] hover:text-white shadow-2xs'
                              : 'bg-amber-50/80 text-amber-900 border border-amber-200 hover:bg-amber-100',
                          )}
                        >
                          {p.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* TAT SLA Options */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-md inline-block">
                    TAT SLA
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['30 mins', '1-2 hour', '2-5 hours', 'Custom'].map((tat) => {
                      const isSelected = selectedTicket.tatOption === tat

                      return (
                        <Button
                          key={tat}
                          type="button"
                          variant="ghost"
                          disabled={!canUpdateTicket}
                          onClick={() => canUpdateTicket && handleUpdateOption({ tatOption: tat })}
                          className={cn(
                            'px-4 py-2 h-auto rounded-xl text-xs font-bold transition-all',
                            canUpdateTicket ? 'cursor-pointer' : 'cursor-not-allowed',
                            isSelected
                              ? 'bg-[#005390] text-white hover:bg-[#005390] hover:text-white shadow-2xs'
                              : 'bg-amber-50/80 text-amber-900 border border-amber-200 hover:bg-amber-100',
                          )}
                        >
                          {tat}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                {canUpdateTicket && (
                  <div className="pt-4 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={() => setIsAssignDrawerOpen(true)}
                      className="px-5 py-2.5 h-auto bg-[#005390] hover:bg-[#004273] text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                    >
                      <UserPlus className="w-4 h-4" /> Assign Person
                    </Button>

                    {isSelfAssigned && selectedTicket.status !== 'CLOSED' && (
                      <Button
                        type="button"
                        onClick={() => handleUpdateOption({ status: 'CLOSED' })}
                        className="px-5 py-2.5 h-auto bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Close Ticket
                      </Button>
                    )}
                  </div>
                )}

                {/* Resident Feedback on the completed work */}
                {selectedTicket.feedback && (
                  <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-extrabold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#005390]" />
                        Resident Feedback
                      </h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          FEEDBACK_RATING_STYLES[selectedTicket.feedback.rating] || FEEDBACK_RATING_STYLES.AVERAGE
                        }`}
                      >
                        {FEEDBACK_RATING_LABELS[selectedTicket.feedback.rating] || selectedTicket.feedback.rating}
                      </span>
                    </div>

                    {selectedTicket.feedback.comment && (
                      <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-line">
                        {selectedTicket.feedback.comment}
                      </p>
                    )}

                    <div className="text-[10px] font-semibold text-gray-400">
                      {describeFeedbackAuthor(selectedTicket.feedback)}
                      {selectedTicket.feedback.createdAt
                        ? ` · ${new Date(selectedTicket.feedback.createdAt).toLocaleString()}`
                        : ''}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-12">
              <AlertCircle className="w-12 h-12 mb-3 text-gray-300" />
              <h3 className="text-base font-bold text-gray-700">No Ticket Selected</h3>
              <p className="text-xs text-gray-500 mt-1">
                Select a ticket from the left panel to manage options and assign employees.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Modals & Drawers */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        locationId={selectedLocationId}
        onSuccess={fetchTickets}
      />

      <SelectPersonDrawer
        isOpen={isAssignDrawerOpen}
        ticket={selectedTicket}
        locationId={selectedLocationId}
        onClose={() => setIsAssignDrawerOpen(false)}
        onAssignSuccess={fetchTickets}
      />

      <AddInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        ticket={selectedTicket}
        locationId={selectedLocationId}
        onSuccess={fetchTickets}
      />

      {/* Change TAT Modal */}
      <Dialog
        open={Boolean(isTatModalOpen && selectedTicket)}
        onOpenChange={(open) => {
          if (!open) setIsTatModalOpen(false)
        }}
      >
        {isTatModalOpen && selectedTicket && (
          <DialogContent className="sm:max-w-sm p-5 space-y-4">
            <DialogHeader className="border-b pb-3 pr-8">
              <DialogTitle className="text-sm font-bold text-gray-900">Change TAT SLA</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set expected resolution time for ticket #{selectedTicket.ticketNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {['30 mins', '1-2 hour', '2-5 hours', 'Custom'].map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleUpdateOption({ tatOption: option })
                    setIsTatModalOpen(false)
                  }}
                  className={cn(
                    'p-3 h-auto rounded-xl border text-xs font-bold cursor-pointer transition-all',
                    selectedTicket.tatOption === option
                      ? 'border-[#005390] bg-blue-50 text-[#005390] hover:bg-blue-100 hover:text-[#005390]'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700',
                  )}
                >
                  {option}
                </Button>
              ))}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Lightbox Image Preview Modal */}
      <Dialog
        open={Boolean(previewMediaUrl)}
        onOpenChange={(open) => {
          if (!open) setPreviewMediaUrl(null)
        }}
      >
        {previewMediaUrl && (
          <DialogContent className="sm:max-w-4xl p-2 bg-background border overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
              <DialogDescription>Enlarged ticket attachment preview</DialogDescription>
            </DialogHeader>
            <img
              src={previewMediaUrl}
              alt="Enlarged preview"
              className="w-full max-h-[82vh] object-contain rounded-xl"
            />
          </DialogContent>
        )}
      </Dialog>

      <ConfirmStatusChangeDialog
        ticketNumber={selectedTicket?.ticketNumber}
        fromStatus={selectedTicket?.status}
        toStatus={pendingStatus}
        isPending={changingStatus}
        onCancel={() => setPendingStatus(null)}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  )
}

export { TicketsPage }
