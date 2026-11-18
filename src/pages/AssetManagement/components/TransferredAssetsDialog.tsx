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
import { useGetTransferredAssets } from '@/hooks/react-query/assetManagement'
import type { TransferredAssetSummary } from '@/lib/types'
import AssetDetailDialog from './AssetDetailDialog'

const assetLabel = (asset: TransferredAssetSummary) =>
  [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' · ') ||
  '—'

const destinationLabel = (asset: TransferredAssetSummary) =>
  asset.transferToCenterName || asset.location?.property_name || '—'

interface TransferredAssetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TransferredAssetsDialog = ({ open, onOpenChange }: TransferredAssetsDialogProps) => {
  const { data, isLoading } = useGetTransferredAssets({ enabled: open })
  const assets = data?.data || []
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Transfer</DialogTitle>
            <DialogDescription>Assets transferred from this center to another center.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-gray-500">Loading…</p>
            ) : assets.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No assets transferred to other centers.</p>
            ) : (
              assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setDetailAssetId(asset.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2.5 text-left transition-colors hover:bg-violet-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005390]/40"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-gray-900">{assetLabel(asset)}</p>
                    <p className="text-xs text-gray-500">To {destinationLabel(asset)}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 bg-violet-100 text-violet-900 border-violet-200 capitalize"
                  >
                    Transferred
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

export default TransferredAssetsDialog
