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
import type { AssetItemRequest, ItemRequestAssetGateStatus, ItemRequestAssetRef, ItemRequestReason } from '@/lib/types'
import { cn, formatDisplayDate, formatDisplayDateTime } from '@/lib/utils'

const REASON_LABELS: Record<ItemRequestReason, string> = {
  scrap: 'Scrap',
  repair: 'Repair',
  external_use: 'External use',
  inter_center_transfer: 'Inter-Center transfer',
}

const SEND_CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  good: 'Good',
  bad: 'Bad',
  partially_damage: 'Partially damage',
}

const statusBadgeClass = (status: string) => {
  if (status === 'approved' || status === 'returned') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'declined' || status === 'return_declined') return 'bg-red-100 text-red-800 border-red-200'
  if (status === 'cancelled') return 'bg-gray-100 text-gray-700 border-gray-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}

const gateStepClass = (value?: ItemRequestAssetGateStatus) => {
  if (value === 'approved') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (value === 'declined') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}

const statusLabel = (status?: string | null) => (status ? status.replace(/_/g, ' ') : '—')

const getEnrichedAssetLabel = (asset: ItemRequestAssetRef) =>
  [asset.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' - ') || '—'

const TrackStep = ({
  label,
  value,
  decidedByName,
  decidedAt,
}: {
  label: string
  value?: ItemRequestAssetGateStatus
  decidedByName?: string | null
  decidedAt?: string | null
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    <Badge variant="outline" className={cn('w-fit capitalize', gateStepClass(value))}>
      {statusLabel(value || 'pending')}
    </Badge>
    {value && value !== 'pending' && decidedByName ? (
      <span className="text-[11px] leading-tight text-gray-500">by {decidedByName}</span>
    ) : null}
    {value && value !== 'pending' && decidedAt ? (
      <span className="text-[11px] leading-tight text-gray-500">{formatDisplayDateTime(decidedAt)}</span>
    ) : null}
  </div>
)

interface GatePassDetailDialogProps {
  request: AssetItemRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GatePassDetailDialog = ({ request, open, onOpenChange }: GatePassDetailDialogProps) => {
  if (!request) return null

  const isInterCenter = request.reason === 'inter_center_transfer'
  const showReturnTrack = request.reason !== 'scrap'
  const returnTrackLabel = isInterCenter ? 'Inward' : 'Return'
  const declineComment =
    request.status === 'return_declined'
      ? request.returnDeclineComment || request.declineComment
      : request.declineComment
  const declineImage =
    request.status === 'return_declined' ? request.returnDeclineImage || request.declineImage : request.declineImage

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gate Pass Details</DialogTitle>
          <DialogDescription>Full gate pass information and per-asset outbound / return track.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</p>
              <p className="mt-0.5 font-medium text-gray-900">{request.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</p>
              <p className="mt-0.5 font-medium text-gray-900">{request.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {REASON_LABELS[request.reason] || request.reason}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
              <div className="mt-1 flex flex-col gap-0.5">
                <Badge variant="outline" className={cn('w-fit capitalize', statusBadgeClass(request.status))}>
                  {statusLabel(request.status)}
                </Badge>
                {request.decidedByName ? (
                  <span className="text-[11px] text-gray-500">by {request.decidedByName}</span>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Generated on</p>
              <p className="mt-0.5 font-medium text-gray-900">
                {request.createdAt ? formatDisplayDate(request.createdAt) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expected return</p>
              <p className="mt-0.5 font-medium text-gray-900">
                {request.expectedReturnDate ? formatDisplayDate(request.expectedReturnDate) : '—'}
              </p>
            </div>
            {isInterCenter ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">From center</p>
                  <p className="mt-0.5 font-medium text-gray-900">{request.fromCenterName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">To center</p>
                  <p className="mt-0.5 font-medium text-gray-900">{request.toCenterName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Send condition</p>
                  <p className="mt-0.5 font-medium text-gray-900 capitalize">
                    {request.transferSendCondition
                      ? SEND_CONDITION_LABELS[request.transferSendCondition] || request.transferSendCondition
                      : '—'}
                  </p>
                </div>
                {request.transferReceiveCondition ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Receive condition</p>
                    <p className="mt-0.5 font-medium text-gray-900 capitalize">
                      {SEND_CONDITION_LABELS[request.transferReceiveCondition] || request.transferReceiveCondition}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</p>
              <p className="mt-0.5 text-gray-800">{request.problem || '—'}</p>
            </div>
            {request.transferReceiveDescription ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Receive notes</p>
                <p className="mt-0.5 text-gray-800">{request.transferReceiveDescription}</p>
              </div>
            ) : null}
            {request.transferRejectDescription ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reject notes</p>
                <p className="mt-0.5 text-gray-800">{request.transferRejectDescription}</p>
              </div>
            ) : null}
            {request.qrCode ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">QR code</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-gray-800">{request.qrCode}</p>
              </div>
            ) : null}
            {request.requestImage ? (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Attachment</p>
                <img
                  src={request.requestImage}
                  alt="Gate pass attachment"
                  className="max-h-48 w-full rounded-lg border border-gray-200 bg-white object-contain"
                />
              </div>
            ) : null}
            {declineComment ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Decline comment</p>
                <p className="mt-0.5 text-gray-800">{declineComment}</p>
              </div>
            ) : null}
            {declineImage ? (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Decline image</p>
                <img
                  src={declineImage}
                  alt="Decline evidence"
                  className="max-h-48 w-full rounded-lg border border-gray-200 bg-white object-contain"
                />
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Asset track</h3>
            {request.assets?.length ? (
              <ul className="space-y-3">
                {request.assets.map((asset) => {
                  const showAssetReturn = showReturnTrack && asset.outboundStatus !== 'declined'
                  return (
                    <li
                      key={asset.id}
                      className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{getEnrichedAssetLabel(asset)}</p>
                          <p className="text-xs text-gray-500">
                            Current status:{' '}
                            <span className="capitalize text-gray-700">{statusLabel(asset.status)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                        <TrackStep
                          label="Outbound"
                          value={asset.outboundStatus}
                          decidedByName={asset.outboundDecidedByName}
                          decidedAt={asset.outboundDecidedAt}
                        />
                        {showAssetReturn ? (
                          <>
                            <div className="hidden w-px bg-gray-200 sm:block" />
                            <TrackStep
                              label={returnTrackLabel}
                              value={asset.returnStatus}
                              decidedByName={asset.returnDecidedByName}
                              decidedAt={asset.returnDecidedAt}
                            />
                          </>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500">
                No assets linked to this gate pass.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GatePassDetailDialog
