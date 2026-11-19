import React, { useMemo, useRef, useState } from 'react'
import { Copy, Download, Edit, FileText, History, PackageCheck, Plus, QrCode, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateAsset,
  useCreateItemRequest,
  useDeleteAsset,
  useGetAssetCategories,
  useGetAssetItemsDropdown,
  useGetAssets,
  useGetAssetVendorsDropdown,
  useGetEmployeesForAssignment,
  useGetItemRequests,
  useGetServiceLogs,
  useMakeAssetAvailable,
  useRegenerateAssetQr,
  useUpdateAsset,
} from '@/hooks/react-query/assetManagement'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { useLocationStore } from '@/lib/stores/locationStore'
import type {
  Asset,
  AssetCondition,
  AssetItemRequest,
  AssetStatus,
  ItemRequestReason,
  ServiceType,
  TransferSendCondition,
} from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'
import { BulkUploadModal } from './BulkUploadModal'
import AssetDetailDialog from './AssetDetailDialog'
import AssetTimelineDialog from './AssetTimeline/AssetTimelineDialog'
import MakeAvailableDialog, { type MakeAvailableInspectionResult } from './MakeAvailableDialog'
import InspectionServiceLogDialog from './InspectionServiceLogDialog'
import { AcceptTransferDialog } from './AcceptTransferDialog'
import { RejectTransferDialog } from './RejectTransferDialog'

const getAssetOptionLabel = (asset: Asset) =>
  [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' - ') ||
  '—'

const isAssetInTransferFlow = (status: AssetStatus) =>
  status === 'inter_center_outbound_pending' ||
  status === 'inter_center_incoming' ||
  status === 'pending_transfer_acceptance' ||
  status === 'transfer_rejected'

const isTransferredRegistryAtOrigin = (asset: Asset) => Boolean(asset.showAtOriginAsTransferred)

const ASSET_STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'external_use', label: 'External use' },
  { value: 'pending_inspection', label: 'Pending inspection' },
  { value: 'inter_center_outbound_pending', label: 'Transfer — outbound pending' },
  { value: 'inter_center_incoming', label: 'Transfer — incoming' },
  { value: 'pending_transfer_acceptance', label: 'Transfer — awaiting acceptance' },
  { value: 'transfer_rejected', label: 'Transfer rejected' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'scrap', label: 'Scrap' },
  { value: 'retired', label: 'Retired' },
]

interface AssetListProps {
  enabled?: boolean
}

const AssetList: React.FC<AssetListProps> = ({ enabled = true }) => {
  const { selectedLocationId, selectedLocationName, accessibleLocations } = useLocationStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const externalFileInputRef = useRef<HTMLInputElement>(null)
  const [externalModalMode, setExternalModalMode] = useState<'bulk' | null>(null)
  const [tableSelectedAssetIds, setTableSelectedAssetIds] = useState<string[]>([])
  const [gatePassReason, setGatePassReason] = useState<ItemRequestReason | ''>('external_use')
  const [externalEmployeeId, setExternalEmployeeId] = useState('')
  const [externalEmployeeSearch, setExternalEmployeeSearch] = useState('')
  const [externalDescription, setExternalDescription] = useState('')
  const [externalReturnDate, setExternalReturnDate] = useState('')
  const [externalImage, setExternalImage] = useState('')
  const [transferToLocId, setTransferToLocId] = useState('')
  const [transferContactName, setTransferContactName] = useState('')
  const [transferSendCondition, setTransferSendCondition] = useState<TransferSendCondition>('good')
  const [acceptTransferAsset, setAcceptTransferAsset] = useState<Asset | null>(null)
  const [rejectTransferAsset, setRejectTransferAsset] = useState<Asset | null>(null)
  const [qrPreview, setQrPreview] = useState<AssetItemRequest | null>(null)
  const [assetQrPreview, setAssetQrPreview] = useState<{
    id: string
    qrCode?: string | null
    qrCodeImage?: string | null
    label?: string
  } | null>(null)
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)
  const [timelineAsset, setTimelineAsset] = useState<Asset | null>(null)
  const [makeAvailableAsset, setMakeAvailableAsset] = useState<Asset | null>(null)
  const [inspectionServiceAsset, setInspectionServiceAsset] = useState<Asset | null>(null)
  const [inspectionServiceType, setInspectionServiceType] = useState<Extract<ServiceType, 'repair' | 'scrap'> | null>(
    null,
  )
  const [inspectionDescription, setInspectionDescription] = useState('')
  const [inspectionDocument, setInspectionDocument] = useState('')
  const [serialNumberError, setSerialNumberError] = useState('')
  const [formData, setFormData] = useState({
    categoryId: '',
    itemId: '',
    vendorId: '',
    serialNumber: '',
    assetTag: '',
    purchaseDate: '',
    purchasePrice: '',
    warrantyEndDate: '',
    warrantyDocument: null as File | null,
    warrantyDocumentName: '',
    warrantyDocumentUrl: '',
    condition: 'good' as AssetCondition,
    status: 'available' as AssetStatus,
    notes: '',
  })

  const { data: assetsData, isLoading } = useGetAssets({
    search: searchTerm,
    limit: 1000,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    enabled,
  })

  const { data: serviceLogsData } = useGetServiceLogs({
    limit: 1000,
    enabled,
  })

  const { data: itemRequestsData } = useGetItemRequests({
    limit: 1000,
    enabled,
  })

  const { data: categoriesData } = useGetAssetCategories({
    limit: 1000,
    enabled: isModalOpen,
  })

  const { data: itemsData } = useGetAssetItemsDropdown({
    categoryId: formData.categoryId,
    enabled: isModalOpen && !!formData.categoryId,
  })

  const { data: vendorsData } = useGetAssetVendorsDropdown({
    categoryId: formData.categoryId,
    enabled: isModalOpen && !!formData.categoryId,
  })

  const { data: employeesData } = useGetEmployeesForAssignment({
    enabled: !!externalModalMode,
  })

  const createMutation = useCreateAsset()
  const updateMutation = useUpdateAsset()
  const deleteMutation = useDeleteAsset()
  const createGatePassMutation = useCreateItemRequest()
  const makeAvailableMutation = useMakeAssetAvailable()
  const regenerateQrMutation = useRegenerateAssetQr()

  const getAssetPublicUrl = (assetId: string) => `${window.location.origin}/public/assets/${assetId}`

  const assets = useMemo(() => assetsData?.data?.assets || [], [assetsData?.data?.assets])

  const gatePassEligibleAssets = useMemo(() => assets.filter((asset) => asset.status === 'available'), [assets])

  const bulkSelectedAssets = useMemo(
    () => assets.filter((asset) => tableSelectedAssetIds.includes(asset.id)),
    [assets, tableSelectedAssetIds],
  )

  const allEligibleTableSelected =
    gatePassEligibleAssets.length > 0 &&
    gatePassEligibleAssets.every((asset) => tableSelectedAssetIds.includes(asset.id))
  const repairPendingAssetIds = useMemo(() => {
    const ids = new Set<string>()
    const logs = serviceLogsData?.data?.serviceLogs || []
    for (const log of logs) {
      if (log.serviceType !== 'repair' || log.completionStatus !== 'pending') continue
      const linked = log.assetIds?.length
        ? log.assetIds
        : log.assets?.map((a) => a.id) || (log.assetId ? [log.assetId] : [])
      for (const id of linked) ids.add(id)
    }
    return ids
  }, [serviceLogsData?.data?.serviceLogs])

  /** Assets with outbound gate approved by L3 and not yet inwarded (return still pending). */
  const outboundApprovedAwaitingReturnIds = useMemo(() => {
    const ids = new Set<string>()
    const requests = itemRequestsData?.data?.itemRequests || []
    for (const request of requests) {
      if (request.reason !== 'external_use') continue
      const assetsOnPass = request.assets || []
      const hasPerAssetOutbound = assetsOnPass.some((a) => !!a.outboundStatus)

      if (hasPerAssetOutbound) {
        for (const linked of assetsOnPass) {
          const outbound = linked.outboundStatus || 'pending'
          const returnStatus = linked.returnStatus || 'pending'
          if (outbound === 'approved' && returnStatus === 'pending') {
            ids.add(linked.id)
          }
        }
        continue
      }

      // Legacy gate passes without per-asset outbound/return fields.
      if (request.status === 'approved') {
        for (const linked of assetsOnPass) ids.add(linked.id)
        for (const id of request.assetIds || []) ids.add(id)
      }
    }
    return ids
  }, [itemRequestsData?.data?.itemRequests])

  const destinationCenters = useMemo(
    () => accessibleLocations.filter((loc) => loc.id && loc.id !== selectedLocationId),
    [accessibleLocations, selectedLocationId],
  )

  const transferSendConditionForAsset = useMemo(() => {
    if (!acceptTransferAsset) return null
    const requests = itemRequestsData?.data?.itemRequests || []
    const open = requests.find(
      (req) =>
        req.reason === 'inter_center_transfer' &&
        req.status === 'returned' &&
        (req.assetIds?.includes(acceptTransferAsset.id) || req.assets?.some((a) => a.id === acceptTransferAsset.id)),
    )
    return open?.transferSendCondition ?? null
  }, [acceptTransferAsset, itemRequestsData?.data?.itemRequests])

  const canShowMakeAvailableOnAsset = (asset: Asset) => {
    // Origin-center transferred registry is read-only — destination owns availability.
    if (isTransferredRegistryAtOrigin(asset)) return false
    if (asset.status === 'external_use') {
      // Hide after L3 outbound approval until inward (return) completes.
      // Keep visible while gate pass exists but is still pending approval.
      return !outboundApprovedAwaitingReturnIds.has(asset.id)
    }
    if (asset.status === 'pending_inspection') {
      return !repairPendingAssetIds.has(asset.id)
    }
    return false
  }
  const categories = categoriesData?.data?.categories || []
  const items = itemsData?.data || []
  const vendors = vendorsData?.data || []
  const employees = useMemo(() => employeesData?.data || [], [employeesData?.data])

  const filteredEmployees = useMemo(() => {
    const q = externalEmployeeSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        (emp.role || '').toLowerCase().includes(q) ||
        (emp.phone || '').includes(q),
    )
  }, [employees, externalEmployeeSearch])

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAsset(null)
    setSerialNumberError('')
  }

  const handleSubmit = async () => {
    if (!editingAsset) {
      if (!formData.categoryId) {
        toast.error('Category is required')
        return
      }
      if (!formData.itemId) {
        toast.error('Item is required')
        return
      }
    }

    const cleanedSerialNumber = formData.serialNumber.trim()
    if (cleanedSerialNumber) {
      const serialExists = assets.some(
        (asset) =>
          asset.id !== editingAsset?.id &&
          (asset.serialNumber || '').trim().toLowerCase() === cleanedSerialNumber.toLowerCase(),
      )
      if (serialExists) {
        setSerialNumberError('An asset with this serial number already exists')
        return
      }
    }
    setSerialNumberError('')

    try {
      const payload = new FormData()

      if (!editingAsset) {
        payload.append('itemId', formData.itemId)
        if (formData.vendorId) {
          payload.append('vendorId', formData.vendorId)
        }
        payload.append('locationId', selectedLocationId || '')
      }

      if (cleanedSerialNumber) payload.append('serialNumber', cleanedSerialNumber)
      if (formData.assetTag) payload.append('assetTag', formData.assetTag)
      if (formData.purchaseDate) payload.append('purchaseDate', formData.purchaseDate)
      if (formData.purchasePrice) {
        payload.append('purchasePrice', String(parseFloat(formData.purchasePrice)))
        payload.append('currentValue', String(parseFloat(formData.purchasePrice)))
      }
      if (formData.warrantyEndDate) payload.append('warrantyEndDate', formData.warrantyEndDate)
      payload.append('condition', formData.condition)
      payload.append('status', formData.status)
      if (formData.notes) payload.append('notes', formData.notes)
      if (formData.warrantyDocument) {
        payload.append('warrantyDocument', formData.warrantyDocument)
      } else if (editingAsset) {
        payload.append('warrantyDocumentUrl', formData.warrantyDocumentUrl || '')
      }

      if (editingAsset) {
        await updateMutation.mutateAsync({
          id: editingAsset.id,
          data: payload,
        })
        toast.success('Asset updated successfully')
        handleCloseModal()
      } else {
        const result = await createMutation.mutateAsync(payload)
        toast.success('Asset created successfully')
        handleCloseModal()
        const created = result?.data
        if (created) {
          setAssetQrPreview({
            id: created.id,
            qrCode: created.qrCode || created.id,
            qrCodeImage: created.qrCodeImage,
            label: getAssetOptionLabel(created),
          })
        }
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      const message = err?.response?.data?.message || 'Failed to save asset'
      if (message.toLowerCase().includes('serial number')) {
        setSerialNumberError(message)
        return
      }
      toast.error(message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Asset deleted successfully')
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to delete asset')
    }
  }

  const getStatusBadge = (status: AssetStatus | string) => {
    const statusConfig: Record<string, string> = {
      available: 'bg-green-100 text-green-800 border-green-200',
      assigned: 'bg-blue-100 text-blue-800 border-blue-200',
      maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
      retired: 'bg-gray-100 text-gray-800 border-gray-200',
      disposed: 'bg-red-100 text-red-800 border-red-200',
      scrap: 'bg-red-100 text-red-800 border-red-200',
      repair: 'bg-amber-100 text-amber-800 border-amber-200',
      external_use: 'bg-violet-100 text-violet-800 border-violet-200',
      pending_inspection: 'bg-cyan-100 text-cyan-900 border-cyan-200',
      inter_center_outbound_pending: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      inter_center_incoming: 'bg-sky-100 text-sky-900 border-sky-200',
      transferred_registry: 'bg-violet-100 text-violet-900 border-violet-200',
      pending_transfer_acceptance: 'bg-amber-100 text-amber-900 border-amber-200',
      transfer_rejected: 'bg-red-100 text-red-800 border-red-200',
    }
    return statusConfig[status] || statusConfig.available
  }

  const resetExternalModal = () => {
    setExternalModalMode(null)
    setGatePassReason('external_use')
    setExternalEmployeeId('')
    setExternalEmployeeSearch('')
    setExternalDescription('')
    setExternalReturnDate('')
    setExternalImage('')
    setTransferToLocId('')
    setTransferContactName('')
    setTransferSendCondition('good')
    if (externalFileInputRef.current) externalFileInputRef.current.value = ''
  }

  const toggleTableAssetSelection = (assetId: string) => {
    setTableSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId],
    )
  }

  const toggleSelectAllEligibleAssets = () => {
    if (allEligibleTableSelected) {
      setTableSelectedAssetIds([])
      return
    }
    setTableSelectedAssetIds(gatePassEligibleAssets.map((asset) => asset.id))
  }

  const handleOpenBulkGatePass = () => {
    if (tableSelectedAssetIds.length === 0) {
      toast.error('Select at least one available asset')
      return
    }
    setExternalModalMode('bulk')
    setGatePassReason('external_use')
    setExternalEmployeeId('')
    setExternalEmployeeSearch('')
    setExternalDescription('')
    setExternalReturnDate('')
    setExternalImage('')
  }

  const handleOpenMakeAvailable = (asset: Asset) => {
    setMakeAvailableAsset(asset)
  }

  const handleMakeAvailableConfirm = async (result: MakeAvailableInspectionResult) => {
    if (!makeAvailableAsset) return

    if (result.nextAction === 'repair' || result.nextAction === 'scrap') {
      setInspectionServiceAsset(makeAvailableAsset)
      setInspectionServiceType(result.nextAction)
      setInspectionDescription(result.description || '')
      setInspectionDocument(result.document || '')
      setMakeAvailableAsset(null)
      return
    }

    try {
      await makeAvailableMutation.mutateAsync({
        id: makeAvailableAsset.id,
        data: {
          condition: result.condition,
          description: result.description,
          document: result.document,
        },
      })
      setMakeAvailableAsset(null)
    } catch {
      // toast handled in mutation
    }
  }

  const handleExternalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setExternalImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleGenerateGatePass = async () => {
    if (externalModalMode !== 'bulk') return

    const assetIds = tableSelectedAssetIds
    if (assetIds.length === 0) {
      toast.error('Select at least one asset')
      return
    }

    if (gatePassReason === 'inter_center_transfer') {
      if (!transferToLocId) {
        toast.error('Select destination center')
        return
      }
      const name = transferContactName
        .replace(/[^a-zA-Z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!name || !/^[a-zA-Z\s]+$/.test(name)) {
        toast.error('Name must contain alphabets only')
        return
      }
      try {
        const result = await createGatePassMutation.mutateAsync({
          name,
          phone: '',
          assetIds,
          reason: 'inter_center_transfer',
          problem: externalDescription.trim() || undefined,
          requestImage: externalImage || undefined,
          toLocId: transferToLocId,
          transferSendCondition,
        })
        resetExternalModal()
        setTableSelectedAssetIds([])
        if (result?.data) setQrPreview(result.data)
      } catch {
        // toast in mutation
      }
      return
    }

    if (gatePassReason !== 'external_use') {
      toast.error('Select a valid reason')
      return
    }

    const employee = employees.find((emp) => emp.id === externalEmployeeId)
    if (!employee) {
      toast.error('Please select an employee')
      return
    }

    const name = employee.name
      .replace(/[^a-zA-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!name || !/^[a-zA-Z\s]+$/.test(name)) {
      toast.error('Employee name must contain alphabets only for gate pass')
      return
    }

    const phone = (employee.phone || '').replace(/\D/g, '').slice(0, 10)
    if (phone && phone.length !== 10) {
      toast.error('Employee phone must be exactly 10 digits')
      return
    }

    try {
      const result = await createGatePassMutation.mutateAsync({
        name,
        phone,
        assetIds,
        reason: 'external_use',
        problem: externalDescription.trim() || undefined,
        requestImage: externalImage || undefined,
        expectedReturnDate: externalReturnDate || undefined,
      })
      resetExternalModal()
      setTableSelectedAssetIds([])
      if (result?.data) setQrPreview(result.data)
    } catch {
      // toast handled in mutation
    }
  }

  const handleCopyQrCode = async () => {
    const code = qrPreview?.qrCode?.trim()
    if (!code) {
      toast.error('QR code is not available')
      return
    }
    try {
      await navigator.clipboard.writeText(code)
      toast.success('QR code copied')
    } catch {
      toast.error('Failed to copy QR code')
    }
  }

  const handleDownloadQr = async () => {
    const imageSrc = qrPreview?.qrCodeImage
    const code = qrPreview?.qrCode?.trim() || 'gate-pass-qr'
    if (!imageSrc) {
      toast.error('QR image is not available')
      return
    }
    try {
      const response = await fetch(imageSrc)
      if (!response.ok) throw new Error('Failed to fetch QR image')
      const blob = await response.blob()
      const extension = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gate-pass-qr-${code}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('QR downloaded')
    } catch {
      toast.error('Failed to download QR')
    }
  }

  const handleViewAssetQr = async (asset: Asset) => {
    if (asset.qrCodeImage) {
      setAssetQrPreview({
        id: asset.id,
        qrCode: asset.qrCode || asset.id,
        qrCodeImage: asset.qrCodeImage,
        label: getAssetOptionLabel(asset),
      })
      return
    }
    try {
      const result = await regenerateQrMutation.mutateAsync(asset.id)
      const data = result?.data
      setAssetQrPreview({
        id: asset.id,
        qrCode: data?.qrCode || asset.id,
        qrCodeImage: data?.qrCodeImage || null,
        label: getAssetOptionLabel(asset),
      })
    } catch {
      // toast handled in mutation
    }
  }

  const handleCopyAssetQrLink = async () => {
    if (!assetQrPreview?.id) {
      toast.error('QR link is not available')
      return
    }
    try {
      await navigator.clipboard.writeText(getAssetPublicUrl(assetQrPreview.id))
      toast.success('Asset QR link copied')
    } catch {
      toast.error('Failed to copy QR link')
    }
  }

  const handleDownloadAssetQr = async () => {
    const imageSrc = assetQrPreview?.qrCodeImage
    const code = assetQrPreview?.qrCode?.trim() || assetQrPreview?.id || 'asset-qr'
    if (!imageSrc) {
      toast.error('QR image is not available')
      return
    }
    try {
      const response = await fetch(imageSrc)
      if (!response.ok) throw new Error('Failed to fetch QR image')
      const blob = await response.blob()
      const extension = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `asset-qr-${code}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('QR downloaded')
    } catch {
      toast.error('Failed to download QR')
    }
  }

  const handleOpenModal = (asset?: Asset) => {
    setSerialNumberError('')
    if (asset) {
      setEditingAsset(asset)
      setFormData({
        categoryId: asset.item?.category?.id || asset.item?.categoryId || '',
        itemId: asset.itemId,
        vendorId: asset.vendorId || '',
        serialNumber: asset.serialNumber || '',
        assetTag: asset.assetTag || '',
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
        purchasePrice: asset.purchasePrice?.toString() || '',
        warrantyEndDate: asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toISOString().split('T')[0] : '',
        warrantyDocument: null,
        warrantyDocumentName: '',
        warrantyDocumentUrl: asset.warrantyDocumentUrl || '',
        condition: asset.condition,
        status: asset.status,
        notes: asset.notes || '',
      })
    } else {
      setEditingAsset(null)
      setFormData({
        categoryId: '',
        itemId: '',
        vendorId: '',
        serialNumber: '',
        assetTag: '',
        purchaseDate: '',
        purchasePrice: '',
        warrantyEndDate: '',
        warrantyDocument: null,
        warrantyDocumentName: '',
        warrantyDocumentUrl: '',
        condition: 'good',
        status: 'available',
        notes: '',
      })
    }
    setIsModalOpen(true)
  }

  const columns: ColumnDef<Asset>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={allEligibleTableSelected}
          onCheckedChange={toggleSelectAllEligibleAssets}
          aria-label="Select all available assets"
          disabled={gatePassEligibleAssets.length === 0}
        />
      ),
      cell: ({ row }) => {
        const canSelect = row.original.status === 'available' && !isTransferredRegistryAtOrigin(row.original)
        return (
          <Checkbox
            checked={tableSelectedAssetIds.includes(row.original.id)}
            disabled={!canSelect}
            onCheckedChange={() => toggleTableAssetSelection(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={canSelect ? 'Select asset for gate pass' : 'Asset not available for gate pass'}
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <div>
          <p className="font-medium truncate">{row.original.item?.name}</p>
          <p className="text-xs text-gray-500 truncate">{row.original.item?.model || '-'}</p>
        </div>
      ),
    },
    {
      id: 'serialTag',
      header: 'Serial/Tag',
      cell: ({ row }) => (
        <div className="text-xs truncate">{row.original.serialNumber || row.original.assetTag || '-'}</div>
      ),
    },
    {
      accessorKey: 'warrantyEndDate',
      header: 'Warranty End Date',
      cell: ({ row }) => formatDisplayDate(row.original.warrantyEndDate),
    },
    {
      id: 'warrantyDocument',
      header: 'Warranty Document',
      cell: ({ row }) =>
        row.original.warrantyDocumentUrl ? (
          <a
            href={row.original.warrantyDocumentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
          >
            View
          </a>
        ) : (
          '-'
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const asset = row.original
        const transferredRegistry = isTransferredRegistryAtOrigin(asset)
        const outboundTransferAtFrom =
          asset.transferOriginLocationId &&
          selectedLocationId &&
          asset.transferOriginLocationId === selectedLocationId &&
          asset.locationId !== selectedLocationId &&
          isAssetInTransferFlow(asset.status)
        let label: string
        let badgeKey: AssetStatus | 'transferred_registry' = asset.status
        if (transferredRegistry) {
          label = `Transferred to ${asset.transferToCenterName || asset.location?.property_name || 'destination center'}`
          badgeKey = 'transferred_registry'
        } else if (asset.status === 'external_use') {
          label = 'External use'
        } else if (asset.status === 'pending_inspection') {
          label = 'Pending inspection'
        } else if (asset.status === 'inter_center_outbound_pending') {
          label = 'Transfer — outbound pending'
        } else if (outboundTransferAtFrom) {
          label = `Transfer to ${asset.transferToCenterName || asset.location?.property_name || 'destination center'}`
        } else if (asset.status === 'inter_center_incoming' && asset.transferFromCenterName) {
          label = `Transfer from ${asset.transferFromCenterName}`
        } else if (asset.status === 'pending_transfer_acceptance') {
          label = asset.transferFromCenterName
            ? `Transfer from ${asset.transferFromCenterName} — awaiting acceptance`
            : 'Transfer — awaiting acceptance'
        } else if (asset.status === 'transfer_rejected') {
          label = 'Transfer rejected'
        } else {
          label = asset.status.replace(/_/g, ' ')
        }
        return <Badge className={`capitalize ${getStatusBadge(badgeKey)}`}>{label}</Badge>
      },
    },
    {
      accessorKey: 'condition',
      header: 'Condition',
      cell: ({ row }) => <span className="capitalize">{row.original.condition}</span>,
    },
    {
      accessorKey: 'currentValue',
      header: 'Value',
      cell: ({ row }) => (row.original.currentValue ? `₹${row.original.currentValue.toLocaleString('en-IN')}` : '-'),
    },
    {
      id: 'qr',
      header: 'QR',
      cell: ({ row }) => {
        const asset = row.original
        if (isTransferredRegistryAtOrigin(asset)) {
          return <span className="text-xs text-gray-400">—</span>
        }
        if (!asset.qrCodeImage) {
          return (
            <button
              type="button"
              className="inline-flex items-center cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation()
                void handleViewAssetQr(asset)
              }}
              title="Generate / view asset QR"
              disabled={regenerateQrMutation.isPending}
            >
              <span className="text-xs text-gray-500">—</span>
            </button>
          )
        }
        return (
          <button
            type="button"
            className="inline-flex items-center cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation()
              void handleViewAssetQr(asset)
            }}
            title="View asset QR"
          >
            <img
              src={asset.qrCodeImage}
              alt="Asset QR"
              className="w-12 h-12 object-contain rounded border border-gray-200 group-hover:opacity-80 transition-opacity bg-white"
            />
          </button>
        )
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const asset = row.original
        const transferredRegistry = isTransferredRegistryAtOrigin(asset)
        const isScrap = asset.status === 'scrap'
        const inTransfer = isAssetInTransferFlow(asset.status)
        const pendingTransferAcceptance = asset.status === 'pending_transfer_acceptance'
        /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stop row click only */
        return (
          <div className="flex justify-end items-center gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTimelineAsset(asset)}
              className="h-8 w-8 p-0 text-[#005390] hover:text-[#005390] hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Asset history"
            >
              <History className="h-4 w-4" />
            </Button>
            {pendingTransferAcceptance && (
              <>
                <PermissionGuard permission="assets:update">
                  <Button size="sm" variant="outline" onClick={() => setAcceptTransferAsset(asset)}>
                    Accept
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission="assets:update">
                  <Button size="sm" variant="destructive" onClick={() => setRejectTransferAsset(asset)}>
                    Reject
                  </Button>
                </PermissionGuard>
              </>
            )}
            {canShowMakeAvailableOnAsset(asset) && (
              <PermissionGuard permission="assets:update">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenMakeAvailable(asset)}
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-gray-100"
                  title="Make available"
                  disabled={makeAvailableMutation.isPending}
                >
                  <PackageCheck className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            )}
            {!isScrap && !inTransfer && !transferredRegistry && (
              <PermissionGuard permission="assets:update">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenModal(asset)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Edit asset"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            )}
            {!inTransfer && !transferredRegistry && (
              <PermissionGuard permission="assets:delete">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(asset.id)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Delete asset"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </PermissionGuard>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={assets}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search assets..."
            onRowClick={(asset) => setDetailAsset(asset)}
            filterActions={
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (!value) return
                    setStatusFilter(String(value))
                    setTableSelectedAssetIds([])
                  }}
                >
                  <SelectTrigger
                    aria-label="Filter assets by status"
                    className="w-auto min-w-[180px] h-9 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
                  >
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUS_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tableSelectedAssetIds.length > 0 && (
                  <PermissionGuard permission="assets:create">
                    <Button variant="default" onClick={handleOpenBulkGatePass}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate Gate Pass ({tableSelectedAssetIds.length})
                    </Button>
                  </PermissionGuard>
                )}
                <PermissionGuard permission="assets:create">
                  <Button variant="outline" onClick={() => setIsBulkUploadModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Add Assets
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission="assets:create">
                  <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                </PermissionGuard>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
            <DialogDescription>{editingAsset ? 'Update asset information' : 'Register a new asset'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="categoryId" className="mb-2">
                Category <span className="text-red-500">*</span>
              </Label>
              {editingAsset ? (
                <Input value={editingAsset.item?.category?.name || ''} disabled className="bg-gray-50" />
              ) : (
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => {
                    if (!value) return
                    setFormData({
                      ...formData,
                      categoryId: value,
                      itemId: '',
                      vendorId: '',
                    })
                  }}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select category first" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemId" className="mb-2">
                  Asset Item <span className="text-red-500">*</span>
                </Label>
                {editingAsset ? (
                  <Input
                    value={
                      editingAsset.item?.name
                        ? `${editingAsset.item.name}${editingAsset.item.model ? ` (${editingAsset.item.model})` : ''}`
                        : ''
                    }
                    disabled
                    className="bg-gray-50"
                  />
                ) : (
                  <Select
                    value={formData.itemId}
                    onValueChange={(value) => {
                      if (!value) return
                      setFormData({ ...formData, itemId: value })
                    }}
                    disabled={!formData.categoryId}
                  >
                    <SelectTrigger className="w-[100%]">
                      <SelectValue placeholder={formData.categoryId ? 'Select asset item' : 'Select category first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} {item.model && `(${item.model})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="vendorId" className="mb-2">
                  Vendor (Optional)
                </Label>
                {editingAsset ? (
                  <Input value={editingAsset.vendor?.name || ''} disabled className="bg-gray-50" />
                ) : (
                  <Select
                    value={formData.vendorId}
                    onValueChange={(value) => {
                      if (!value) return
                      setFormData({ ...formData, vendorId: value })
                    }}
                    disabled={!formData.categoryId}
                  >
                    <SelectTrigger className="w-[100%]">
                      <SelectValue
                        placeholder={formData.categoryId ? 'Select vendor (optional)' : 'Select category first'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serialNumber" className="mb-2">
                  Serial Number
                </Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, serialNumber: e.target.value })
                    if (serialNumberError) setSerialNumberError('')
                  }}
                  placeholder="Serial number"
                  className={serialNumberError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {serialNumberError && <p className="mt-1 text-xs text-red-500">{serialNumberError}</p>}
              </div>

              <div>
                <Label htmlFor="assetTag" className="mb-2">
                  Asset Tag
                </Label>
                <Input
                  id="assetTag"
                  value={formData.assetTag}
                  onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                  placeholder="Asset tag"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseDate" className="mb-2">
                  Purchase Date
                </Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextPurchaseDate = e.target.value
                      const shouldResetWarrantyEndDate =
                        prev.warrantyEndDate && nextPurchaseDate && prev.warrantyEndDate <= nextPurchaseDate

                      return {
                        ...prev,
                        purchaseDate: nextPurchaseDate,
                        warrantyEndDate: shouldResetWarrantyEndDate ? '' : prev.warrantyEndDate,
                      }
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="purchasePrice" className="mb-2">
                  Purchase Price (₹)
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="warrantyEndDate" className="mb-2">
                  Warranty End Date
                </Label>
                <Input
                  id="warrantyEndDate"
                  type="date"
                  value={formData.warrantyEndDate}
                  min={
                    formData.purchaseDate
                      ? new Date(new Date(formData.purchaseDate).getTime() + 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      : undefined
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      warrantyEndDate: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="warrantyDocument" className="mb-2 block">
                  Warranty Document
                </Label>
                {formData.warrantyDocument ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center space-x-2 truncate mr-2">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-xs font-medium text-blue-900 truncate">
                        Selected: {formData.warrantyDocumentName || formData.warrantyDocument.name}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          warrantyDocument: null,
                          warrantyDocumentName: '',
                        }))
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-100 flex-shrink-0"
                      title="Remove selected file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : formData.warrantyDocumentUrl ? (
                  <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center space-x-2 truncate mr-2">
                      <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <a
                        href={formData.warrantyDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-blue-600 hover:underline truncate"
                      >
                        View current document
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          warrantyDocumentUrl: '',
                          warrantyDocument: null,
                          warrantyDocumentName: '',
                        }))
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1"
                      title="Delete current document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Input
                      ref={fileInputRef}
                      id="warrantyDocument"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setFormData((prev) => ({
                          ...prev,
                          warrantyDocument: file,
                          warrantyDocumentName: file?.name || '',
                        }))
                      }}
                    />
                    {editingAsset && editingAsset.warrantyDocumentUrl && !formData.warrantyDocumentUrl && (
                      <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                        <span>Current file marked for deletion (will be removed when updated)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              warrantyDocumentUrl: editingAsset.warrantyDocumentUrl || '',
                            }))
                          }}
                          className="h-auto p-0 text-amber-800 underline font-medium hover:text-amber-900 ml-2 shrink-0 hover:bg-transparent"
                        >
                          Undo
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="condition" className="mb-2">
                  Condition <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => {
                    if (!value) return
                    setFormData({
                      ...formData,
                      condition: value as AssetCondition,
                    })
                  }}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status" className="mb-2">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => {
                    if (!value) return
                    setFormData({ ...formData, status: value as AssetStatus })
                  }}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                    <SelectItem value="scrap">Scrap</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="external_use">External use</SelectItem>
                    <SelectItem value="pending_inspection">Pending inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="mb-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingAsset ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* External Use / Generate Gate Pass Modal */}
      <Dialog
        open={!!externalModalMode}
        onOpenChange={(open) => {
          if (!open) resetExternalModal()
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Gate Pass</DialogTitle>
            <DialogDescription>Create one QR gate pass for the selected assets.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-1 py-2">
            {bulkSelectedAssets.length > 0 && (
              <div>
                <Label className="mb-2">Selected assets</Label>
                <div className="flex flex-wrap gap-1.5">
                  {bulkSelectedAssets.map((asset) => (
                    <Badge key={asset.id} variant="secondary">
                      {getAssetOptionLabel(asset)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Select
                value={gatePassReason || undefined}
                onValueChange={(value) => {
                  if (!value) return
                  setGatePassReason(value as ItemRequestReason)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_use">External use</SelectItem>
                  <SelectItem value="inter_center_transfer">Inter-Center transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {gatePassReason === 'inter_center_transfer' && (
              <>
                <div>
                  <Label className="mb-2">From Center</Label>
                  <Input value={selectedLocationName || '—'} readOnly disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="mb-2">
                    To Center <span className="text-red-500">*</span>
                  </Label>
                  <Select value={transferToLocId || undefined} onValueChange={setTransferToLocId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select center" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationCenters.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No other centers available
                        </SelectItem>
                      ) : (
                        destinationCenters.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.property_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={transferContactName}
                    onChange={(e) => setTransferContactName(e.target.value)}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <Label className="mb-2">
                    Asset Send Condition <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={transferSendCondition}
                    onValueChange={(v) => setTransferSendCondition(v as TransferSendCondition)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="bad">Bad</SelectItem>
                      <SelectItem value="partially_damage">Partially damage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2">Description</Label>
                  <Textarea
                    value={externalDescription}
                    onChange={(e) => setExternalDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="mb-2">Upload File</Label>
                  <div className="flex items-start gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => externalFileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {externalImage ? 'Change Image' : 'Upload Image'}
                    </Button>
                    <input
                      ref={externalFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleExternalImageChange}
                    />
                    {externalImage ? (
                      <div className="relative">
                        <img
                          src={externalImage}
                          alt="Transfer attachment"
                          className="h-16 w-16 rounded-md object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setExternalImage('')
                            if (externalFileInputRef.current) externalFileInputRef.current.value = ''
                          }}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}

            {gatePassReason === 'external_use' && (
              <>
                <div>
                  <Label className="mb-2">
                    Employee <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={externalEmployeeSearch}
                    onChange={(e) => setExternalEmployeeSearch(e.target.value)}
                    placeholder="Search employees..."
                    className="mb-2 h-8"
                  />
                  <Select
                    value={externalEmployeeId}
                    onValueChange={(value) => {
                      if (!value) return
                      setExternalEmployeeId(value)
                    }}
                  >
                    <SelectTrigger className="w-full !h-10">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEmployees.length === 0 ? (
                        <SelectItem value="__no_employees__" disabled>
                          No employees found
                        </SelectItem>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                            {emp.role ? ` (${emp.role})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2">Upload File</Label>
                  <div className="flex items-start gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => externalFileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {externalImage ? 'Change Image' : 'Upload Image'}
                    </Button>
                    <input
                      ref={externalFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleExternalImageChange}
                    />
                    {externalImage ? (
                      <div className="relative">
                        <img
                          src={externalImage}
                          alt="External use attachment"
                          className="h-16 w-16 rounded-md object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setExternalImage('')
                            if (externalFileInputRef.current) externalFileInputRef.current.value = ''
                          }}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <Label htmlFor="external-description" className="mb-2">
                    Description
                  </Label>
                  <Textarea
                    id="external-description"
                    value={externalDescription}
                    onChange={(e) => setExternalDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="external-return-date" className="mb-2">
                    Expected Return Date
                  </Label>
                  <Input
                    id="external-return-date"
                    type="date"
                    value={externalReturnDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setExternalReturnDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetExternalModal} disabled={createGatePassMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleGenerateGatePass} disabled={createGatePassMutation.isPending}>
              {createGatePassMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrPreview} onOpenChange={(open) => !open && setQrPreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {qrPreview?.reason === 'inter_center_transfer' ? 'Inter-Center Transfer Gate Pass' : 'Gate Pass'}
            </DialogTitle>
            <DialogDescription>Scan this code to view the full gate pass details.</DialogDescription>
          </DialogHeader>
          {qrPreview && (
            <div className="flex flex-col items-center gap-3 py-2">
              {qrPreview.qrCodeImage ? (
                <img
                  src={qrPreview.qrCodeImage}
                  alt="Gate pass QR"
                  className="w-56 h-56 object-contain rounded border border-gray-200 bg-white"
                />
              ) : null}
              <p className="text-sm font-mono font-bold text-gray-700">{qrPreview.qrCode}</p>
              <div className="w-full rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm space-y-1">
                <p>
                  <span className="font-semibold text-gray-700">Name:</span> {qrPreview.name}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Phone:</span> {qrPreview.phone || '—'}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Assets:</span>{' '}
                  {qrPreview.assets
                    ?.map((a) => [a.name, a.serialNumber, a.assetTag].filter((v) => v && String(v).trim()).join(' - '))
                    .join(', ') || '—'}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Expected return:</span>{' '}
                  {qrPreview.expectedReturnDate ? formatDisplayDate(qrPreview.expectedReturnDate) : '—'}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Description:</span> {qrPreview.problem || '—'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setQrPreview(null)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleCopyQrCode} disabled={!qrPreview?.qrCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button onClick={handleDownloadQr} disabled={!qrPreview?.qrCodeImage}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assetQrPreview} onOpenChange={(open) => !open && setAssetQrPreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asset QR Code</DialogTitle>
            <DialogDescription>
              Scan with Google Lens or your phone camera to view this asset&apos;s details.
            </DialogDescription>
          </DialogHeader>
          {assetQrPreview && (
            <div className="flex flex-col items-center gap-3 py-2">
              {assetQrPreview.qrCodeImage ? (
                <img
                  src={assetQrPreview.qrCodeImage}
                  alt="Asset QR"
                  className="w-56 h-56 object-contain rounded border border-gray-200 bg-white"
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center px-4">
                  QR image is not available yet. Ensure PUBLIC_APP_URL is set on the server, then use View QR again.
                </p>
              )}
              {assetQrPreview.label ? (
                <p className="text-sm font-medium text-gray-800 text-center">{assetQrPreview.label}</p>
              ) : null}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAssetQrPreview(null)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleCopyAssetQrLink} disabled={!assetQrPreview?.id}>
              <Copy className="h-4 w-4 mr-2" />
              Copy link
            </Button>
            <Button onClick={handleDownloadAssetQr} disabled={!assetQrPreview?.qrCodeImage}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkUploadModal open={isBulkUploadModalOpen} onOpenChange={setIsBulkUploadModalOpen} />

      <AssetDetailDialog
        asset={detailAsset}
        open={!!detailAsset}
        onOpenChange={(open) => {
          if (!open) setDetailAsset(null)
        }}
      />

      <AssetTimelineDialog
        asset={timelineAsset}
        open={!!timelineAsset}
        onOpenChange={(open) => {
          if (!open) setTimelineAsset(null)
        }}
      />

      <MakeAvailableDialog
        asset={makeAvailableAsset}
        open={!!makeAvailableAsset}
        isPending={makeAvailableMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setMakeAvailableAsset(null)
        }}
        onConfirm={handleMakeAvailableConfirm}
      />

      <AcceptTransferDialog
        asset={acceptTransferAsset}
        defaultSendCondition={transferSendConditionForAsset}
        open={!!acceptTransferAsset}
        onOpenChange={(open) => !open && setAcceptTransferAsset(null)}
      />
      <RejectTransferDialog
        asset={rejectTransferAsset}
        open={!!rejectTransferAsset}
        onOpenChange={(open) => !open && setRejectTransferAsset(null)}
      />

      <InspectionServiceLogDialog
        asset={inspectionServiceAsset}
        open={!!inspectionServiceAsset && !!inspectionServiceType}
        serviceType={inspectionServiceType}
        inspectionDescription={inspectionDescription}
        inspectionDocument={inspectionDocument}
        onOpenChange={(open) => {
          if (!open) {
            setInspectionServiceAsset(null)
            setInspectionServiceType(null)
            setInspectionDescription('')
            setInspectionDocument('')
          }
        }}
        onCompleted={() => {
          setInspectionServiceAsset(null)
          setInspectionServiceType(null)
          setInspectionDescription('')
          setInspectionDocument('')
        }}
      />
    </>
  )
}

export default AssetList
