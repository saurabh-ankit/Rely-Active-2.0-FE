import React, { useState, useEffect, useMemo, useRef } from 'react'
import { X, Loader2, Building2, Home, Mic, Square, Play, Pause, Trash2, Volume2, Paperclip } from 'lucide-react'
import { z } from 'zod'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { TicketPriority } from '@/lib/types'

interface DepartmentItem {
  id: string
  name: string
  jobCategories?: { id: string; name: string }[]
}

interface ParsedFlatItem {
  id: string
  unitNumber: string
  blockName: string
  blockId: string
  isSold?: boolean
  isOccupied?: boolean
  residents?: { id: string; firstName: string; lastName: string }[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  locationId: string | null
  onSuccess: () => void
}

// Zod Validation Schema for Ticket Creation
const createTicketValidationSchema = z
  .object({
    ticketTarget: z.enum(['UNIT', 'COMMON_AREA']),
    selectedFlatId: z.string().optional(),
    description: z.string().trim().min(1, 'Add description or Voice Note is required'),
    categoryName: z.string().trim().min(1, 'Please select a Category'),
    jobCategoryId: z.string().trim().min(1, 'Please select an Assign Role Category'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']),
  })
  .refine(
    (data) => {
      if (data.ticketTarget === 'UNIT') {
        return Boolean(data.selectedFlatId && data.selectedFlatId.trim() !== '')
      }
      return true
    },
    {
      message: 'Please select a Flat / Unit',
      path: ['selectedFlatId'],
    },
  )

export function CreateTicketModal({ isOpen, onClose, locationId, onSuccess }: Props) {
  // Ticket Target Scope: 'UNIT' | 'COMMON_AREA'
  const [ticketTarget, setTicketTarget] = useState<'UNIT' | 'COMMON_AREA'>('UNIT')

  // Block & Flat Cascading Selection
  const [selectedBlockName, setSelectedBlockName] = useState<string>('')
  const [selectedFlatId, setSelectedFlatId] = useState<string>('')

  // Form Fields
  const [description, setDescription] = useState('')
  const [categoryName, setCategoryName] = useState('R&M (Repair)')
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM')
  const [jobCategoryId, setJobCategoryId] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Data Lists
  const [parsedFlats, setParsedFlats] = useState<ParsedFlatItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProperty, setIsLoadingProperty] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Clean up recording & audio timers on close/unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // Fetch Departments & Property Details via Property API according to header location
  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        const deptRes = await apiClient.get('/departments')
        if (deptRes.data?.data) {
          setDepartments(deptRes.data.data)
        }

        if (locationId && locationId !== 'all') {
          setIsLoadingProperty(true)
          const propRes = await apiClient.get(API_ENDPOINTS.property.getById(locationId))
          const propData = propRes.data?.data || propRes.data

          if (propData && Array.isArray(propData.blocks)) {
            const extractedFlats: ParsedFlatItem[] = []

            for (const block of propData.blocks) {
              const bName = block.block_name || block.blockNumber || 'A'
              const bId = block.id || bName

              if (Array.isArray(block.floors)) {
                for (const floor of block.floors) {
                  if (Array.isArray(floor.units)) {
                    for (const u of floor.units) {
                      const uNum = u.unit_number || u.unitNumber || ''
                      if (u.id && uNum) {
                        const hasResidents = Array.isArray(u.residents) && u.residents.length > 0
                        const occStatus = (u.occupancyStatus || u.occupancy_status || '').toString().toUpperCase()
                        const unitStatus = (u.status || u.unit_status || u.unitStatus || '').toString().toUpperCase()
                        const isExplicitSold = u.is_sold === true || u.isSold === true

                        const isSold =
                          isExplicitSold ||
                          hasResidents ||
                          unitStatus === 'SOLD' ||
                          unitStatus === 'BOOKED' ||
                          occStatus === 'OWNER_OCCUPIED' ||
                          occStatus === 'TENANT_OCCUPIED' ||
                          occStatus === 'OCCUPIED'

                        extractedFlats.push({
                          id: u.id,
                          unitNumber: uNum,
                          blockName: bName,
                          blockId: bId,
                          isSold,
                          isOccupied: isSold,
                          residents: u.residents || [],
                        })
                      }
                    }
                  }
                }
              }
            }

            // Filter for sold flats only
            const soldFlats = extractedFlats.filter((f) => f.isSold)
            const finalFlats = soldFlats.length > 0 ? soldFlats : extractedFlats
            setParsedFlats(finalFlats)

            const uniqueBlocks = Array.from(new Set(finalFlats.map((f) => f.blockName))).sort()
            if (uniqueBlocks.length > 0) {
              setSelectedBlockName(uniqueBlocks[0])
            }
          }
          setIsLoadingProperty(false)
        }
      } catch (err) {
        console.error('Failed to fetch property details:', err)
        setIsLoadingProperty(false)
      }
    }

    fetchData()
  }, [isOpen, locationId])

  // Voice Recording Actions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        setDescription((prev) => (prev.trim() ? prev : '🎤 Voice Note Recorded'))

        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone access error:', err)
      setErrorMsg('Microphone access is required for voice recording. Please allow microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }

  const toggleAudioPlay = () => {
    if (!audioElementRef.current && audioUrl) {
      const audio = new Audio(audioUrl)
      audioElementRef.current = audio
      audio.onended = () => setIsPlayingAudio(false)
    }

    if (audioElementRef.current) {
      if (isPlayingAudio) {
        audioElementRef.current.pause()
        setIsPlayingAudio(false)
      } else {
        audioElementRef.current.play()
        setIsPlayingAudio(true)
      }
    }
  }

  const deleteVoiceRecording = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setIsPlayingAudio(false)
    setRecordingSeconds(0)
  }

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`
  }

  // Dynamically map selected Category -> Department -> Filtered Job Categories (Roles)
  const activeDepartmentObj = useMemo(() => {
    if (departments.length === 0) return undefined

    let matched: DepartmentItem | undefined

    if (categoryName.includes('Repair') || categoryName.includes('Maintenance') || categoryName.includes('R&M')) {
      matched = departments.find(
        (d) => d.name.toLowerCase().includes('repair') || d.name.toLowerCase().includes('maintenance'),
      )
    } else if (categoryName.includes('Concierge')) {
      matched = departments.find((d) => d.name.toLowerCase().includes('concierge'))
    }

    return matched || departments[0]
  }, [categoryName, departments])

  // Fallback static job categories matching requirement
  const fallbackJobCategories = useMemo(() => {
    if (categoryName.includes('Concierge')) {
      return [
        { id: 'con-1', name: 'Housekeeping' },
        { id: 'con-2', name: 'Laundry' },
        { id: 'con-3', name: 'Customer Support' },
        { id: 'con-4', name: 'Transportation' },
        { id: 'con-5', name: 'Others' },
      ]
    }
    return [
      { id: 'rnm-1', name: 'Electrical' },
      { id: 'rnm-2', name: 'Carpentry' },
      { id: 'rnm-3', name: 'Plumbing' },
      { id: 'rnm-4', name: 'Miscellaneous' },
    ]
  }, [categoryName])

  // Job categories for active department ONLY
  const availableJobCategories = useMemo(() => {
    if (activeDepartmentObj?.jobCategories && activeDepartmentObj.jobCategories.length > 0) {
      return activeDepartmentObj.jobCategories
    }
    return fallbackJobCategories
  }, [activeDepartmentObj, fallbackJobCategories])

  if (!isOpen) return null

  const availableBlocks = Array.from(new Set(parsedFlats.map((f) => f.blockName))).sort()
  const flatsInSelectedBlock = parsedFlats.filter((f) => f.blockName === selectedBlockName)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setFieldErrors({})

    const finalDescription = description.trim() || (audioBlob ? '🎤 Voice Note Recorded' : '')

    // Validate form inputs using Zod Schema upon submission
    const validationResult = createTicketValidationSchema.safeParse({
      ticketTarget,
      selectedFlatId,
      description: finalDescription,
      categoryName,
      jobCategoryId,
      priority,
    })

    if (!validationResult.success) {
      const formattedErrors: Record<string, string> = {}
      for (const issue of validationResult.error.issues) {
        if (issue.path[0]) {
          formattedErrors[issue.path[0].toString()] = issue.message
        }
      }
      setFieldErrors(formattedErrors)
      const firstErrorMessage = validationResult.error.issues[0]?.message || 'Please fill in all mandatory fields'
      setErrorMsg(firstErrorMessage)
      return
    }

    if (!locationId) {
      setErrorMsg('Please select an active header property location')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('locId', locationId)

      const selectedFlatObj = parsedFlats.find((f) => f.id === selectedFlatId)
      const generatedTitle =
        ticketTarget === 'UNIT' && selectedFlatObj
          ? `${categoryName} - Flat ${selectedFlatObj.blockName}-${selectedFlatObj.unitNumber}`
          : `${categoryName} - Common Area`

      formData.append('title', generatedTitle)
      formData.append('description', finalDescription)
      formData.append('category', categoryName)
      formData.append('priority', priority)

      if (ticketTarget === 'UNIT' && selectedFlatId) {
        formData.append('unitId', selectedFlatId)
        if (selectedFlatObj?.residents && selectedFlatObj.residents.length > 0) {
          formData.append('residentId', selectedFlatObj.residents[0].id)
        }
      }

      if (activeDepartmentObj?.id) {
        formData.append('departmentId', activeDepartmentObj.id)
      }
      if (jobCategoryId.trim()) {
        formData.append('jobCategoryId', jobCategoryId.trim())
      }

      // Voice Audio File Attachment
      if (audioBlob) {
        const audioFile = new File([audioBlob], `voicenote_${Date.now()}.webm`, { type: 'audio/webm' })
        formData.append('attachment', audioFile)
      } else if (file) {
        formData.append('attachment', file)
      }

      const url = API_ENDPOINTS.tickets.create(locationId)
      await apiClient.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      onSuccess()
      onClose()

      // Reset Form State
      setDescription('')
      setCategoryName('R&M (Repair)')
      setPriority('MEDIUM')
      setSelectedFlatId('')
      setJobCategoryId('')
      setFile(null)
      deleteVoiceRecording()
    } catch (err: unknown) {
      console.error('Failed to create ticket:', err)
      setErrorMsg('Failed to create ticket. Please check backend connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-900">Add Ticket</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Ticket Target Scope: Unit / Flat vs Common Area */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTicketTarget('UNIT')
                setFieldErrors({})
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                ticketTarget === 'UNIT'
                  ? 'bg-white text-[#005390] shadow-2xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" /> Specific Unit / Flat
            </button>
            <button
              type="button"
              onClick={() => {
                setTicketTarget('COMMON_AREA')
                setFieldErrors({})
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                ticketTarget === 'COMMON_AREA'
                  ? 'bg-white text-[#005390] shadow-2xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Common Area
            </button>
          </div>

          {/* Block & Flat Dropdowns */}
          {ticketTarget === 'UNIT' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="create-block-select" className="block text-xs font-bold text-gray-900 mb-1.5">
                  Select Block <span className="text-rose-500">*</span>
                </label>
                <select
                  id="create-block-select"
                  value={selectedBlockName}
                  onChange={(e) => {
                    setSelectedBlockName(e.target.value)
                    setSelectedFlatId('')
                  }}
                  disabled={isLoadingProperty}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#005390]/20 focus:border-[#005390] cursor-pointer disabled:opacity-50"
                >
                  {isLoadingProperty ? (
                    <option value="">Loading blocks...</option>
                  ) : availableBlocks.length > 0 ? (
                    availableBlocks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))
                  ) : (
                    <option value="A">A</option>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="create-flat-select" className="block text-xs font-bold text-gray-900 mb-1.5">
                  Select Flat <span className="text-rose-500">*</span>
                </label>
                <select
                  id="create-flat-select"
                  value={selectedFlatId}
                  onChange={(e) => {
                    setSelectedFlatId(e.target.value)
                    if (fieldErrors.selectedFlatId) {
                      setFieldErrors((prev) => ({ ...prev, selectedFlatId: '' }))
                    }
                  }}
                  disabled={isLoadingProperty}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 cursor-pointer disabled:opacity-50 shadow-2xs ${
                    fieldErrors.selectedFlatId
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-blue-600 focus:ring-blue-500/20'
                  }`}
                >
                  <option value="">Select Flat...</option>
                  {flatsInSelectedBlock.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.blockName}-{f.unitNumber}
                    </option>
                  ))}
                </select>
                {fieldErrors.selectedFlatId && (
                  <p className="text-xs font-semibold text-rose-600 mt-1">{fieldErrors.selectedFlatId}</p>
                )}
              </div>
            </div>
          )}

          {/* Category Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white bg-[#005390] px-4 py-1.5 rounded-lg inline-block tracking-wide">
                Department
              </span>
              <span className="text-rose-500 text-xs font-bold">*</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { key: 'Repair & Maintenance', label: 'Repair & Maintenance' },
                { key: 'Concierge', label: 'Concierge' },
              ].map((cat) => {
                const isSelected = categoryName === cat.key

                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setCategoryName(cat.key)
                      if (fieldErrors.categoryName) {
                        setFieldErrors((prev) => ({ ...prev, categoryName: '' }))
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-50/90 text-amber-950 border-amber-300 shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
            {fieldErrors.categoryName && (
              <p className="text-xs font-semibold text-rose-600 mt-1">{fieldErrors.categoryName}</p>
            )}
          </div>

          {/* Assign Role Category Dropdown */}
          <div>
            <label htmlFor="create-role-cat" className="block text-xs font-bold text-gray-900 mb-1.5">
              Assign Role Category <span className="text-rose-500">*</span>
            </label>
            <select
              id="create-role-cat"
              value={jobCategoryId}
              onChange={(e) => {
                setJobCategoryId(e.target.value)
                if (fieldErrors.jobCategoryId) {
                  setFieldErrors((prev) => ({ ...prev, jobCategoryId: '' }))
                }
              }}
              className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 cursor-pointer ${
                fieldErrors.jobCategoryId
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-gray-300 focus:ring-[#005390]/20'
              }`}
            >
              <option value="">
                {availableJobCategories.length === 0
                  ? `No Role Categories for ${activeDepartmentObj?.name || 'Department'}`
                  : `Select Role Category for ${activeDepartmentObj?.name || 'Department'}...`}
              </option>
              {availableJobCategories.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
            {fieldErrors.jobCategoryId && (
              <p className="text-xs font-semibold text-rose-600 mt-1">{fieldErrors.jobCategoryId}</p>
            )}
          </div>

          {/* Priority Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white bg-[#005390] px-4 py-1.5 rounded-lg inline-block tracking-wide">
                Priority
              </span>
              <span className="text-rose-500 text-xs font-bold">*</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { key: 'CRITICAL', label: 'Critical' },
                { key: 'HIGH', label: 'High' },
                { key: 'MEDIUM', label: 'Medium' },
                { key: 'LOW', label: 'Low' },
              ].map((p) => {
                const isSelected = priority === p.key

                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setPriority(p.key as TicketPriority)
                      if (fieldErrors.priority) {
                        setFieldErrors((prev) => ({ ...prev, priority: '' }))
                      }
                    }}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-50/90 text-amber-950 border-amber-300 shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            {fieldErrors.priority && <p className="text-xs font-semibold text-rose-600 mt-1">{fieldErrors.priority}</p>}
          </div>

          {/* Add Description * (Positioned at the bottom with integrated File & Voice Note icons) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="create-description-text" className="block text-xs font-bold text-gray-900">
                Add description <span className="text-rose-500">*</span>
              </label>

              {/* Inline Action Toolbar Icons (Paperclip / Photo + Voice Note Mic) */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                    file
                      ? 'bg-blue-50 text-[#005390] border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                  title="Attach Photo or File"
                >
                  <Paperclip className="w-4 h-4 text-[#005390]" />
                  {file ? 'File Attached' : ''}
                </button>

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Record Voice Note"
                  >
                    <Mic className="w-4 h-4 text-rose-600" />
                    {audioBlob ? 'Recorded' : ''}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-2 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all animate-pulse cursor-pointer shadow-sm"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" /> Stop ({formatTime(recordingSeconds)})
                  </button>
                )}
              </div>
            </div>

            {/* Audio Voice Player Component */}
            {audioUrl && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAudioPlay}
                    className="w-7 h-7 rounded-full bg-[#005390] text-white flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-[#005390]" /> Voice Note Recorded
                    </div>
                    <div className="text-[10px] text-amber-800 font-mono">Duration: {formatTime(recordingSeconds)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={deleteVoiceRecording}
                  className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                  title="Delete Recording"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Selected File Badge */}
            {file && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-medium text-[#005390]">
                <span className="truncate">📎 {file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <textarea
              id="create-description-text"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (fieldErrors.description) {
                  setFieldErrors((prev) => ({ ...prev, description: '' }))
                }
              }}
              placeholder="Describe the issue or service request in detail (or record voice note using the mic icon)..."
              className={`w-full p-3.5 bg-white border rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 resize-none ${
                fieldErrors.description
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-gray-200 focus:ring-[#005390]/20 focus:border-[#005390]'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-xs font-semibold text-rose-600 mt-1">{fieldErrors.description}</p>
            )}
          </div>

          {/* Create CTA Button (Fully enabled & vibrant with inline validation on click) */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-36 py-3 bg-[#005390] hover:bg-[#004273] active:scale-98 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
