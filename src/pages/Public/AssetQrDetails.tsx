import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  DollarSign,
  Hash,
  Mail,
  Package,
  Phone,
  Printer,
  Shield,
  Store,
  Tag,
  Truck,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPublicAsset } from '@/lib/services/assetService'
import type { PublicAssetDetails } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatDisplayDate } from '@/lib/utils/dateUtils'

const displayOrDash = (value?: string | number | null) => {
  if (value === undefined || value === null || String(value).trim() === '') return '—'
  return String(value)
}

const formatStatusLabel = (status: PublicAssetDetails['status']) => {
  if (status === 'external_use') return 'External use'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const formatConditionLabel = (condition: PublicAssetDetails['condition']) =>
  condition.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const formatAssigneeTypeLabel = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function getWarrantySummary(warrantyEndDate?: string | null): string {
  if (!warrantyEndDate) return 'None'
  const end = new Date(warrantyEndDate)
  if (Number.isNaN(end.getTime())) return 'None'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return end >= today ? `Active · ${formatDisplayDate(warrantyEndDate)}` : 'Expired'
}

const SectionCard = ({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: typeof Shield
  children: React.ReactNode
  className?: string
}) => (
  <Card className={cn('overflow-hidden border-slate-200/80 shadow-sm', className)}>
    <CardHeader className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-[#005390]" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="px-0 py-0">{children}</CardContent>
  </Card>
)

const InfoRow = ({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  icon?: typeof Calendar
  valueClassName?: string
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3.5 last:border-b-0">
    <div className="flex min-w-0 items-center gap-2.5 text-sm text-slate-500">
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400" /> : null}
      <span>{label}</span>
    </div>
    <div className={cn('text-right text-sm font-semibold text-slate-900 break-words max-w-[55%]', valueClassName)}>
      {value}
    </div>
  </div>
)

const StatTile = ({
  label,
  value,
  icon: Icon,
  action,
}: {
  label: string
  value: React.ReactNode
  icon: typeof Tag
  action?: React.ReactNode
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
    <div className="mb-2 flex items-center justify-between gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <Icon className="h-3.5 w-3.5 text-[#005390]" />
    </div>
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-bold text-slate-900 break-all">{value}</p>
      {action}
    </div>
  </div>
)

export default function AssetQrDetailsPage() {
  const { assetId } = useParams<{ assetId: string }>()
  const [asset, setAsset] = useState<PublicAssetDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!assetId) {
        setError('Invalid asset link')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await getPublicAsset(assetId)
        if (cancelled) return
        if (!response?.data) {
          setError('Asset not found')
          setAsset(null)
          return
        }
        setAsset(response.data)
      } catch (err) {
        if (cancelled) return
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Unable to load asset details'
        setError(message)
        setAsset(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [assetId])

  const warrantySummary = useMemo(() => getWarrantySummary(asset?.warrantyEndDate), [asset?.warrantyEndDate])

  const handleCopySerial = async () => {
    const serial = asset?.serialNumber?.trim()
    if (!serial) {
      toast.error('Serial number is not available')
      return
    }
    try {
      await navigator.clipboard.writeText(serial)
      toast.success('Serial number copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handlePrintQr = () => {
    if (!asset?.qrCodeImage) {
      toast.error('QR image is not available')
      return
    }
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      toast.error('Unable to open print window')
      return
    }
    const title = asset.item?.name || 'Asset'
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>${title} QR</title></head>
      <body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
        <img src="${asset.qrCodeImage}" alt="Asset QR" style="width:280px;height:280px;object-fit:contain;" />
        <p style="margin-top:16px;font-size:14px;font-weight:600;">${title}</p>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const statusLabel = asset ? formatStatusLabel(asset.status) : ''
  const isAvailable = asset?.status === 'available'
  const isAssigned = asset?.status === 'assigned'

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#005390] text-sm font-bold text-white">
              R
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Rely Active — Asset Intelligence</p>
              <p className="text-xs text-slate-500">Scanned asset profile</p>
            </div>
          </div>
          {!loading && !error && asset ? (
            <Badge className="shrink-0 gap-1 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified Asset
            </Badge>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-4 px-4 pt-4">
        {loading ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-16 text-center text-sm text-slate-500">Loading asset…</CardContent>
          </Card>
        ) : error ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-16 text-center text-sm text-red-600">{error}</CardContent>
          </Card>
        ) : asset ? (
          <>
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#005390]">
                      {displayOrDash(asset.item?.category?.name)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1.5 border-slate-200 bg-white font-medium capitalize',
                          isAvailable && 'border-emerald-200 text-emerald-800',
                          isAssigned && 'border-blue-200 bg-blue-50/60 text-blue-900',
                          asset.status === 'external_use' && 'border-violet-200 bg-violet-50/60 text-violet-900',
                        )}
                      >
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            isAvailable && 'bg-emerald-500',
                            isAssigned && 'bg-blue-500',
                            asset.status === 'external_use' && 'bg-violet-500',
                            !isAvailable && !isAssigned && asset.status !== 'external_use' && 'bg-slate-400',
                          )}
                        />
                        {statusLabel}
                      </Badge>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50/50 text-emerald-900">
                        Condition: {formatConditionLabel(asset.condition)}
                      </Badge>
                    </div>
                    <h1 className="mt-3 text-2xl font-bold text-slate-900">{asset.item?.name || 'Asset'}</h1>
                    <p className="mt-1 text-sm text-slate-600">
                      {asset.item?.model ? (
                        <>
                          <span className="font-medium text-slate-700">Model:</span> {asset.item.model}
                        </>
                      ) : null}
                      {asset.item?.model && asset.item?.manufacturer ? ' • ' : null}
                      {asset.item?.manufacturer ? (
                        <>
                          <span className="font-medium text-slate-700">Manufacturer:</span> {asset.item.manufacturer}
                        </>
                      ) : null}
                      {!asset.item?.model && !asset.item?.manufacturer ? '—' : null}
                    </p>
                  </div>
                  {asset.qrCodeImage ? (
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                      <div className="rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
                        <img src={asset.qrCodeImage} alt="Asset QR" className="h-[72px] w-[72px] object-contain" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-semibold"
                        onClick={handlePrintQr}
                      >
                        <Printer className="mr-1 h-3 w-3" />
                        Print Sticker
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <StatTile label="Asset Tag" value={displayOrDash(asset.assetTag)} icon={Tag} />
                  <StatTile
                    label="Serial Number"
                    value={displayOrDash(asset.serialNumber)}
                    icon={Hash}
                    action={
                      asset.serialNumber ? (
                        <button
                          type="button"
                          onClick={() => void handleCopySerial()}
                          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-[#005390]"
                          aria-label="Copy serial number"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      ) : null
                    }
                  />
                  <StatTile label="Location" value={displayOrDash(asset.location?.name)} icon={Building2} />
                  <StatTile label="Warranty" value={warrantySummary} icon={Shield} />
                </div>
              </CardContent>
            </Card>

            {asset.status === 'assigned' && asset.assignment ? (
              <SectionCard title="Assignment Details" icon={UserRound}>
                <InfoRow label="Assignee" value={asset.assignment.assigneeName} valueClassName="font-semibold" />
                <InfoRow label="Assignee Type" value={formatAssigneeTypeLabel(asset.assignment.assigneeType)} />
                {asset.assignment.flatInfo ? <InfoRow label="Flat / Unit" value={asset.assignment.flatInfo} /> : null}
                <InfoRow
                  label="Phone"
                  icon={Phone}
                  value={
                    asset.assignment.assigneePhone ? (
                      <a href={`tel:${asset.assignment.assigneePhone}`} className="text-[#005390] hover:underline">
                        {asset.assignment.assigneePhone}
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
                <InfoRow
                  label="Email"
                  icon={Mail}
                  value={
                    asset.assignment.assigneeEmail ? (
                      <a
                        href={`mailto:${asset.assignment.assigneeEmail}`}
                        className="text-[#005390] hover:underline break-all"
                      >
                        {asset.assignment.assigneeEmail}
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
                <InfoRow label="Assigned On" icon={Calendar} value={formatDisplayDate(asset.assignment.assignedAt)} />
                <InfoRow
                  label="Expected Return"
                  icon={Calendar}
                  value={
                    asset.assignment.expectedReturnDate ? formatDisplayDate(asset.assignment.expectedReturnDate) : '—'
                  }
                />
                {asset.assignment.notes?.trim() ? (
                  <InfoRow label="Notes" value={asset.assignment.notes.trim()} />
                ) : null}
              </SectionCard>
            ) : null}

            {asset.status === 'external_use' && asset.externalUse ? (
              <SectionCard title="External Use Details" icon={Truck}>
                <InfoRow label="Taken By" value={asset.externalUse.holderName} valueClassName="font-semibold" />
                <InfoRow
                  label="Phone"
                  icon={Phone}
                  value={
                    asset.externalUse.holderPhone ? (
                      <a href={`tel:${asset.externalUse.holderPhone}`} className="text-[#005390] hover:underline">
                        {asset.externalUse.holderPhone}
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
                {asset.externalUse.description?.trim() ? (
                  <InfoRow label="Description" value={asset.externalUse.description.trim()} />
                ) : null}
                <InfoRow
                  label="Expected Return"
                  icon={Calendar}
                  value={
                    asset.externalUse.expectedReturnDate ? formatDisplayDate(asset.externalUse.expectedReturnDate) : '—'
                  }
                />
                <InfoRow label="Recorded On" icon={Calendar} value={formatDisplayDate(asset.externalUse.recordedAt)} />
              </SectionCard>
            ) : null}

            <SectionCard title="Purchase & Warranty Information" icon={Shield}>
              <InfoRow
                label="Purchase Date"
                icon={Calendar}
                value={asset.purchaseDate ? formatDisplayDate(asset.purchaseDate) : '—'}
              />
              <InfoRow
                label="Purchase Price"
                icon={DollarSign}
                value={asset.purchasePrice != null ? `₹${Number(asset.purchasePrice).toLocaleString('en-IN')}` : '—'}
              />
              <InfoRow
                label="Warranty Expiry"
                icon={Shield}
                value={asset.warrantyEndDate ? formatDisplayDate(asset.warrantyEndDate) : '—'}
              />
            </SectionCard>

            <SectionCard title="Vendor & Support Contact" icon={Store}>
              <InfoRow label="Vendor Name" value={displayOrDash(asset.vendor?.name)} />
              <InfoRow label="Contact Person" value={displayOrDash(asset.vendor?.contactPerson)} />
              <InfoRow
                label="Phone Number"
                icon={Phone}
                value={
                  asset.vendor?.phone ? (
                    <a href={`tel:${asset.vendor.phone}`} className="text-[#005390] hover:underline">
                      {asset.vendor.phone}
                    </a>
                  ) : (
                    '—'
                  )
                }
                valueClassName="font-semibold"
              />
              <InfoRow
                label="Email"
                icon={Mail}
                value={
                  asset.vendor?.email ? (
                    <a href={`mailto:${asset.vendor.email}`} className="text-[#005390] hover:underline break-all">
                      {asset.vendor.email}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
            </SectionCard>

            {asset.notes?.trim() ? (
              <SectionCard title="Additional Notes" icon={Package}>
                <p className="px-4 py-4 text-sm leading-relaxed text-slate-700">{asset.notes.trim()}</p>
              </SectionCard>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  )
}
