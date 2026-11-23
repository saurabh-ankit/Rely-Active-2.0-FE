import { useState } from 'react'
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
import { useGetExpiringWarranties } from '@/hooks/react-query/assetManagement'
import type { ExpiringWarrantyAsset } from '@/lib/types'
import { formatDisplayDate } from '@/lib/utils'
import AssetDetailDialog from './AssetDetailDialog'

const WARRANTY_EXPIRING_DAYS = 10

const daysLabel = (daysRemaining: number) => {
  if (daysRemaining <= 0) return 'Expires today'
  if (daysRemaining === 1) return '1 day left'
  return `${daysRemaining} days left`
}

const assetLabel = (asset: ExpiringWarrantyAsset) =>
  [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' · ') ||
  '—'

interface WarrantyExpiringDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WarrantyExpiringDialog = ({ open, onOpenChange }: WarrantyExpiringDialogProps) => {
  const { data, isLoading } = useGetExpiringWarranties(WARRANTY_EXPIRING_DAYS, { enabled: open })
  const assets = data?.data || []
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Warranties expiring soon</DialogTitle>
            <DialogDescription>
              Assets whose warranty ends within the next {WARRANTY_EXPIRING_DAYS} days.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {isLoading ? (
              <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
            ) : assets.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No warranties expiring in the next 10 days.</p>
            ) : (
              assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setDetailAssetId(asset.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-lg border border-pink-100 bg-pink-50/50 px-3 py-2.5 text-left transition-colors hover:bg-pink-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005390]/40"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate">{assetLabel(asset)}</p>
                    <p className="text-xs text-gray-500">
                      Ends {formatDisplayDate(asset.warrantyEndDate)}
                      {asset.location?.property_name ? ` · ${asset.location.property_name}` : ''}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${
                      asset.daysRemaining <= 3
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {daysLabel(asset.daysRemaining)}
                  </Badge>
                </button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssetDetailDialog
        asset={detailAssetId ? { id: detailAssetId } : null}
        open={!!detailAssetId}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetailAssetId(null)
        }}
      />
    </>
  )
}

export default WarrantyExpiringDialog
