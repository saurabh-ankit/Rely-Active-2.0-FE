import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useGetAssetById } from '@/hooks/react-query/assetManagement'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { Asset, AssetStatus } from '@/lib/types'
import { cn, formatDisplayDate } from '@/lib/utils'

const statusBadgeClass = (status: AssetStatus | string) => {
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
    pending_transfer_acceptance: 'bg-amber-100 text-amber-900 border-amber-200',
    transfer_rejected: 'bg-red-100 text-red-800 border-red-200',
    transferred_registry: 'bg-violet-100 text-violet-900 border-violet-200',
  }
  return statusConfig[status] || statusConfig.available
}

/** Full list row or id-only seed (e.g. warranties popup); details are fetched by id. */
export type AssetDetailSource = Pick<Asset, 'id'> & Partial<Asset>

const isAssetInTransferFlow = (status?: AssetStatus | string | null) =>
  status === 'inter_center_outbound_pending' ||
  status === 'inter_center_incoming' ||
  status === 'pending_transfer_acceptance' ||
  status === 'transfer_rejected'

const resolveStatusDisplay = (
  detail: AssetDetailSource,
  selectedLocationId?: string | null,
): { label: string; badgeKey: string } => {
  const transferredRegistry = Boolean(detail.showAtOriginAsTransferred)
  const destinationName =
    detail.transferToCenterName || detail.location?.property_name || detail.location?.name || 'destination center'

  if (transferredRegistry) {
    return {
      label: `Transferred to ${destinationName}`,
      badgeKey: 'transferred_registry',
    }
  }

  const outboundTransferAtFrom =
    detail.transferOriginLocationId &&
    selectedLocationId &&
    detail.transferOriginLocationId === selectedLocationId &&
    detail.locationId !== selectedLocationId &&
    isAssetInTransferFlow(detail.status)

  if (outboundTransferAtFrom) {
    return {
      label: `Transfer to ${destinationName}`,
      badgeKey: detail.status || 'inter_center_outbound_pending',
    }
  }

  if (detail.status === 'inter_center_incoming' && detail.transferFromCenterName) {
    return {
      label: `Transfer from ${detail.transferFromCenterName}`,
      badgeKey: detail.status,
    }
  }

  if (detail.status === 'pending_transfer_acceptance') {
    return {
      label: detail.transferFromCenterName
        ? `Transfer from ${detail.transferFromCenterName} — awaiting acceptance`
        : 'Transfer — awaiting acceptance',
      badgeKey: detail.status,
    }
  }

  if (detail.status === 'external_use') {
    return { label: 'External use', badgeKey: detail.status }
  }
  if (detail.status === 'pending_inspection') {
    return { label: 'Pending inspection', badgeKey: detail.status }
  }
  if (detail.status === 'inter_center_outbound_pending') {
    return { label: 'Transfer — outbound pending', badgeKey: detail.status }
  }
  if (detail.status === 'transfer_rejected') {
    return { label: 'Transfer rejected', badgeKey: detail.status }
  }

  return {
    label: detail.status ? detail.status.replace(/_/g, ' ') : '—',
    badgeKey: detail.status || 'available',
  }
}

const displayOrDash = (value?: string | number | null) => {
  if (value === undefined || value === null || String(value).trim() === '') return '—'
  return String(value)
}

const DetailField = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <div className={className}>
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <div className="mt-0.5 font-medium text-gray-900">{children}</div>
  </div>
)

interface AssetDetailDialogProps {
  asset: AssetDetailSource | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AssetDetailDialog = ({ asset, open, onOpenChange }: AssetDetailDialogProps) => {
  const { selectedLocationId } = useLocationStore()
  const {
    data: assetResponse,
    isLoading,
    isError,
  } = useGetAssetById(asset?.id || '', {
    enabled: open && !!asset?.id,
  })

  const fetched = assetResponse?.data
  const hasSeedDetails = Boolean(
    asset && ('itemId' in asset || asset.item || asset.serialNumber || asset.assetTag || asset.status),
  )
  const detail = fetched || (hasSeedDetails ? asset : null)

  if (!asset) return null

  const locationName = detail?.location?.property_name || detail?.location?.name || '—'
  const statusDisplay = detail ? resolveStatusDisplay(detail, selectedLocationId) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asset Details</DialogTitle>
          <DialogDescription>Read-only asset information.</DialogDescription>
        </DialogHeader>

        {!detail && isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading asset details…</div>
        ) : !detail && isError ? (
          <div className="py-10 text-center text-sm text-red-600">Failed to load asset details.</div>
        ) : detail ? (
          <div className="space-y-5 py-1">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm sm:grid-cols-2">
              <DetailField label="Item">{displayOrDash(detail.item?.name)}</DetailField>
              <DetailField label="Model">{displayOrDash(detail.item?.model)}</DetailField>
              <DetailField label="Category">{displayOrDash(detail.item?.category?.name)}</DetailField>
              <DetailField label="Manufacturer">{displayOrDash(detail.item?.manufacturer)}</DetailField>
              <DetailField label="Serial number">{displayOrDash(detail.serialNumber)}</DetailField>
              <DetailField label="Asset tag">{displayOrDash(detail.assetTag)}</DetailField>
              <DetailField label="Status">
                <Badge
                  variant="outline"
                  className={cn(
                    'mt-1 w-fit capitalize',
                    statusBadgeClass(statusDisplay?.badgeKey || detail.status || 'available'),
                  )}
                >
                  {statusDisplay?.label || '—'}
                </Badge>
              </DetailField>
              <DetailField label="Condition">
                <span className="capitalize">{displayOrDash(detail.condition)}</span>
              </DetailField>
              <DetailField label="Center / location">{locationName}</DetailField>
              <DetailField label="Vendor">{displayOrDash(detail.vendor?.name)}</DetailField>
              <DetailField label="Purchase date">
                {detail.purchaseDate ? formatDisplayDate(detail.purchaseDate) : '—'}
              </DetailField>
              <DetailField label="Purchase price">
                {detail.purchasePrice != null ? `₹${Number(detail.purchasePrice).toLocaleString('en-IN')}` : '—'}
              </DetailField>
              <DetailField label="Current value">
                {detail.currentValue != null ? `₹${Number(detail.currentValue).toLocaleString('en-IN')}` : '—'}
              </DetailField>
              <DetailField label="Warranty end date">
                {detail.warrantyEndDate ? formatDisplayDate(detail.warrantyEndDate) : '—'}
              </DetailField>
              <DetailField label="Warranty document" className="sm:col-span-2">
                {detail.warrantyDocumentUrl ? (
                  <a
                    href={detail.warrantyDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    View document
                  </a>
                ) : (
                  '—'
                )}
              </DetailField>
              {detail.qrCode ? (
                <DetailField label="QR code" className="sm:col-span-2">
                  <span className="font-mono text-sm font-bold text-gray-800">{detail.qrCode}</span>
                </DetailField>
              ) : null}
              {detail.qrCodeImage ? (
                <DetailField label="QR image" className="sm:col-span-2">
                  <img
                    src={detail.qrCodeImage}
                    alt="Asset QR"
                    className="mt-1 h-28 w-28 rounded-lg border border-gray-200 bg-white object-contain"
                  />
                </DetailField>
              ) : null}
              <DetailField label="Notes" className="sm:col-span-2">
                <p className="whitespace-pre-wrap font-normal text-gray-800">{displayOrDash(detail.notes)}</p>
              </DetailField>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AssetDetailDialog
