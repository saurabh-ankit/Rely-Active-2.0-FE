import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SaveButton } from '@/components/common/SaveButton'
import { useSavedFlash } from '@/hooks/useSavedFlash'
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
  useCreateServiceLog,
  useGetAssetVendorsDropdown,
  useMakeAssetAvailable,
} from '@/hooks/react-query/assetManagement'
import type { Asset, CreateServiceLogRequest, ServiceType } from '@/lib/types'

interface InspectionServiceLogDialogProps {
  asset: Asset | null
  open: boolean
  serviceType: Extract<ServiceType, 'repair' | 'scrap'> | null
  inspectionDescription?: string
  inspectionDocument?: string
  onOpenChange: (open: boolean) => void
  onCompleted: () => void
}

const getAssetOptionLabel = (asset: Asset) =>
  [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' - ') ||
  '—'

const InspectionServiceLogDialog = ({
  asset,
  open,
  serviceType,
  inspectionDescription = '',
  inspectionDocument,
  onOpenChange,
  onCompleted,
}: InspectionServiceLogDialogProps) => {
  const [performedBy, setPerformedBy] = useState('')
  const [performedByError, setPerformedByError] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [description, setDescription] = useState('')
  const [serviceDate] = useState(() => new Date().toISOString().split('T')[0])

  const makeAvailableMutation = useMakeAssetAvailable()
  const createMutation = useCreateServiceLog()
  const { data: vendorsData } = useGetAssetVendorsDropdown({
    enabled: open && serviceType === 'repair',
  })
  const vendors = useMemo(() => vendorsData?.data || [], [vendorsData?.data])

  /* eslint-disable react-hooks/set-state-in-effect -- reset form when dialog opens/closes */
  useEffect(() => {
    if (!open) {
      setPerformedBy('')
      setPerformedByError('')
      setVendorId('')
      setDescription('')
      return
    }
    setDescription(inspectionDescription || '')
    setPerformedBy('')
    setPerformedByError('')
    setVendorId('')
  }, [open, inspectionDescription, serviceType])
  /* eslint-enable react-hooks/set-state-in-effect */
  const { saved, flashSaved } = useSavedFlash()

  if (!asset || !serviceType) return null

  const isScrap = serviceType === 'scrap'
  const categoryName = asset.item?.category?.name || '—'
  const isSaving = makeAvailableMutation.isPending || createMutation.isPending

  const handleSubmit = async () => {
    if (!performedBy.trim()) {
      setPerformedByError('Performed By is required')
      return
    }
    setPerformedByError('')

    try {
      await makeAvailableMutation.mutateAsync({
        id: asset.id,
        data: {
          condition: 'poor',
          description: inspectionDescription || description.trim() || undefined,
          document: inspectionDocument,
        },
        silent: true,
      })

      const payload: CreateServiceLogRequest = {
        assetIds: [asset.id],
        serviceDate: isScrap ? new Date().toISOString().split('T')[0] : serviceDate,
        serviceType,
        performedBy: performedBy.trim(),
      }
      if (!isScrap && vendorId.trim()) {
        payload.vendorId = vendorId.trim()
      }
      if (description.trim()) {
        payload.description = description.trim()
      }

      await createMutation.mutateAsync(payload)
      toast.success(isScrap ? 'Scrap service log created' : 'Repair service log created')
      // ✓ on the button for a moment, then refresh and close
      flashSaved(() => {
        onCompleted()
        onOpenChange(false)
      })
    } catch {
      // toasts handled in mutations
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isScrap ? 'Create Scrap Service Log' : 'Create Repair Service Log'}</DialogTitle>
          <DialogDescription>
            Asset details are prefilled. Enter performed by
            {!isScrap ? ', vendor,' : ''} and description.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-2">Category</Label>
            <Input value={categoryName} disabled className="bg-gray-50" />
          </div>

          <div>
            <Label className="mb-2">Asset</Label>
            <Input value={getAssetOptionLabel(asset)} disabled className="bg-gray-50" />
          </div>

          <div>
            <Label className="mb-2">Service Type</Label>
            <Input value={isScrap ? 'Scrap' : 'Repair'} disabled className="bg-gray-50 capitalize" />
          </div>

          {!isScrap && (
            <div>
              <Label className="mb-2">Service Date</Label>
              <Input type="date" value={serviceDate} disabled className="bg-gray-50" />
            </div>
          )}

          <div>
            <Label htmlFor="inspection-performed-by" className="mb-2">
              Performed By <span className="text-red-500">*</span>
            </Label>
            <Input
              id="inspection-performed-by"
              value={performedBy}
              onChange={(e) => {
                setPerformedBy(e.target.value)
                if (performedByError) setPerformedByError('')
              }}
              placeholder="Name of person who performed the service"
            />
            {performedByError ? <p className="mt-1 text-xs text-red-500">{performedByError}</p> : null}
          </div>

          {!isScrap && (
            <div>
              <Label className="mb-2">Service Vendor</Label>
              <Select
                value={vendorId || undefined}
                onValueChange={(value) => {
                  if (!value) return
                  setVendorId(value)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <SelectItem value="__no_vendors__" disabled>
                      No vendors found
                    </SelectItem>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="inspection-service-description" className="mb-2">
              Description
            </Label>
            <Textarea
              id="inspection-service-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Service description"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <SaveButton onClick={handleSubmit} saving={isSaving} saved={saved} savedLabel="Created" className="gap-2">
            {isSaving ? 'Creating...' : 'Create'}
          </SaveButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default InspectionServiceLogDialog
