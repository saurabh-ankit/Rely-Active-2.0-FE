import { useState } from 'react'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  useCreateCertification,
  useDeleteCertification,
  useGetAssetCategories,
  useGetAssets,
  useGetCertifications,
  useUpdateCertification,
} from '@/hooks/react-query/assetManagement'
import useDebounce from '@/hooks/useDebounce'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import type { AssetComplianceCertification, CertificationType, ComplianceStatus } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'

const Certifications = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCert, setEditingCert] = useState<AssetComplianceCertification | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    assetId: '',
    certificationType: 'regulatory' as CertificationType,
    certificateNumber: '',
    issuingAuthority: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    status: 'valid' as ComplianceStatus,
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [showCertFileInput, setShowCertFileInput] = useState(false)
  const debouncedSearch = useDebounce(searchTerm, 500)

  const { data: certsData, isLoading } = useGetCertifications({
    search: debouncedSearch,
    limit: 1000,
  })

  const { data: categoriesData } = useGetAssetCategories({
    limit: 1000,
    enabled: isModalOpen,
  })

  const { data: assetsData } = useGetAssets({
    categoryId: formData.categoryId,
    limit: 1000,
    enabled: isModalOpen && !!formData.categoryId,
  })

  const createMutation = useCreateCertification()
  const updateMutation = useUpdateCertification()
  const deleteMutation = useDeleteCertification()

  const certifications = certsData?.data?.certifications || []
  const categories = categoriesData?.data?.categories || []
  const assets = assetsData?.data?.assets || []

  const getAssetOptionLabel = (asset: (typeof assets)[number]) => {
    return [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && value.trim()).join(' - ')
  }

  const handleOpenModal = (cert?: AssetComplianceCertification) => {
    if (cert) {
      setEditingCert(cert)
      setFormData({
        categoryId: cert.asset?.item?.category?.id || cert.asset?.item?.categoryId || '',
        assetId: cert.assetId,
        certificationType: cert.certificationType,
        certificateNumber: cert.certificateNumber || '',
        issuingAuthority: cert.issuingAuthority || '',
        issueDate: new Date(cert.issueDate).toISOString().split('T')[0],
        expiryDate: new Date(cert.expiryDate).toISOString().split('T')[0],
        status: cert.status,
      })
      setDocumentFile(null)
      setShowCertFileInput(false)
    } else {
      setEditingCert(null)
      setFormData({
        categoryId: '',
        assetId: '',
        certificationType: 'regulatory',
        certificateNumber: '',
        issuingAuthority: '',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        status: 'valid',
      })
      setDocumentFile(null)
      setShowCertFileInput(false)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCert(null)
    setDocumentFile(null)
    setShowCertFileInput(false)
  }

  const handleSubmit = async () => {
    if (!editingCert && !formData.categoryId) {
      toast.error('Category is required')
      return
    }

    if (!formData.assetId || !formData.issueDate || !formData.expiryDate) {
      toast.error('Asset, Issue Date, and Expiry Date are required')
      return
    }

    const checkValidYear = (dateStr: string) => {
      const year = new Date(dateStr).getFullYear()
      return !isNaN(year) && year >= 1900 && year <= 2100
    }

    if (!checkValidYear(formData.issueDate)) {
      toast.error('Issue Date must have a valid year between 1900 and 2100')
      return
    }

    if (!checkValidYear(formData.expiryDate)) {
      toast.error('Expiry Date must have a valid year between 1900 and 2100')
      return
    }

    if (new Date(formData.expiryDate) <= new Date(formData.issueDate)) {
      toast.error('Expiry Date must be after Issue Date')
      return
    }

    try {
      const submitData = new FormData()
      submitData.append('assetId', formData.assetId)
      submitData.append('certificationType', formData.certificationType)
      submitData.append('issueDate', formData.issueDate)
      submitData.append('expiryDate', formData.expiryDate)
      submitData.append('status', formData.status)

      if (formData.certificateNumber && formData.certificateNumber.trim()) {
        submitData.append('certificateNumber', formData.certificateNumber.trim())
      }

      if (formData.issuingAuthority && formData.issuingAuthority.trim()) {
        submitData.append('issuingAuthority', formData.issuingAuthority.trim())
      }

      if (editingCert?.documentUrl && !documentFile) {
        submitData.append('documentUrl', editingCert.documentUrl)
      }

      if (documentFile) {
        submitData.append('document', documentFile)
      }

      if (editingCert) {
        await updateMutation.mutateAsync({
          id: editingCert.id,
          data: submitData,
        })
        toast.success('Certification updated successfully')
      } else {
        await createMutation.mutateAsync(submitData)
        toast.success('Certification created successfully')
      }
      handleCloseModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save certification'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Certification deleted successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete certification'
      toast.error(errorMessage)
    }
  }

  const certTypeLabels: Record<CertificationType, string> = {
    regulatory: 'Regulatory',
    safety: 'Safety',
    quality: 'Quality',
    environmental: 'Environmental',
  }

  const statusLabels: Record<ComplianceStatus, string> = {
    valid: 'Valid',
    expired: 'Expired',
    expiring_soon: 'Expiring Soon',
    pending_renewal: 'Pending Renewal',
  }

  const getStatusColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800'
      case 'pending_renewal':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const columns: ColumnDef<AssetComplianceCertification>[] = [
    {
      accessorKey: 'asset',
      header: 'Asset',
      cell: ({ row }) => (
        <span>
          {row.original.asset ? `${row.original.asset.serialNumber || ''} - ${row.original.asset.assetTag || ''}` : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'certificationType',
      header: 'Type',
      cell: ({ row }) => <Badge className="capitalize">{certTypeLabels[row.original.certificationType]}</Badge>,
    },
    {
      accessorKey: 'certificateNumber',
      header: 'Certificate Number',
      cell: ({ row }) => row.original.certificateNumber || '-',
    },
    {
      accessorKey: 'issuingAuthority',
      header: 'Issuing Authority',
      cell: ({ row }) => row.original.issuingAuthority || '-',
    },
    {
      accessorKey: 'issueDate',
      header: 'Issue Date',
      cell: ({ row }) => formatDisplayDate(row.original.issueDate),
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry Date',
      cell: ({ row }) => formatDisplayDate(row.original.expiryDate),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>{statusLabels[row.original.status]}</Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const cert = row.original
        return (
          <div className="flex justify-end gap-2 pr-2">
            <PermissionGuard permission="assets:update">
              <Button variant="ghost" size="sm" onClick={() => handleOpenModal(cert)}>
                <Edit className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="assets:delete">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(cert.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </PermissionGuard>
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
            data={certifications}
            isLoading={isLoading}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search certifications..."
            filterActions={
              <PermissionGuard permission="assets:create">
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certification
                </Button>
              </PermissionGuard>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCert ? 'Edit Certification' : 'Add Certification'}</DialogTitle>
            <DialogDescription>
              {editingCert ? 'Update the certification details' : 'Add a new certification record'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 p-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryId">
                Category <span className="text-red-500">*</span>
              </Label>
              {editingCert ? (
                <Input value={editingCert.asset?.item?.category?.name || ''} disabled className="bg-gray-50" />
              ) : (
                <Select
                  value={formData.categoryId}
                  onValueChange={(value: string) =>
                    setFormData({
                      ...formData,
                      categoryId: value,
                      assetId: '',
                    })
                  }
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

            <div className="grid gap-2">
              <Label htmlFor="asset">
                Asset <span className="text-red-500">*</span>
              </Label>
              {editingCert ? (
                <Input
                  value={editingCert.asset ? getAssetOptionLabel(editingCert.asset) : ''}
                  disabled
                  className="bg-gray-50"
                />
              ) : (
                <Select
                  value={formData.assetId}
                  onValueChange={(value: string) => setFormData({ ...formData, assetId: value })}
                  disabled={!formData.categoryId}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue
                      placeholder={
                        formData.categoryId ? 'item name - serial number - asset tag' : 'Select category first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.length === 0 ? (
                      <SelectItem value="__no_assets__" disabled>
                        No Asset Found
                      </SelectItem>
                    ) : (
                      assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {getAssetOptionLabel(asset)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="certificationType">
                Certification Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.certificationType}
                onValueChange={(value: CertificationType) => setFormData({ ...formData, certificationType: value })}
              >
                <SelectTrigger className="w-[100%]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regulatory">Regulatory</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="certificateNumber">Certificate Number</Label>
              <Input
                id="certificateNumber"
                value={formData.certificateNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    certificateNumber: e.target.value,
                  })
                }
                placeholder="e.g., CERT-2024-001"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="issuingAuthority">Issuing Authority</Label>
              <Input
                id="issuingAuthority"
                value={formData.issuingAuthority}
                onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                placeholder="e.g., ISO, FDA, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="issueDate">
                  Issue Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="issueDate"
                  type="date"
                  min={editingCert ? '1900-01-01' : new Date().toISOString().split('T')[0]}
                  max="2100-12-31"
                  value={formData.issueDate}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const nextIssueDate = e.target.value
                      const shouldResetExpiryDate = prev.expiryDate && prev.expiryDate <= nextIssueDate

                      return {
                        ...prev,
                        issueDate: nextIssueDate,
                        expiryDate: shouldResetExpiryDate ? '' : prev.expiryDate,
                      }
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expiryDate">
                  Expiry Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  min={
                    formData.issueDate
                      ? new Date(new Date(formData.issueDate).getTime() + 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      : undefined
                  }
                  max="2100-12-31"
                  value={formData.expiryDate}
                  disabled={!formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: ComplianceStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="w-[100%]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="certDocument">Certification Document</Label>

              {!documentFile && editingCert?.documentUrl && !showCertFileInput && (
                <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">Existing document</span>
                    <a
                      href={editingCert.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      View Document
                    </a>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCertFileInput(true)}>
                    Change
                  </Button>
                </div>
              )}

              {(!editingCert?.documentUrl || showCertFileInput || documentFile) && (
                <>
                  <Input
                    id="certDocument"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                  />
                  {documentFile && <p className="text-xs text-gray-600">Selected file: {documentFile.name}</p>}
                  {!documentFile && !editingCert?.documentUrl && (
                    <p className="text-xs text-gray-500">Upload the certification document (PDF, image, or DOC)</p>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingCert ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Certifications
