import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarClock,
  FileText,
  Home,
  IndianRupee,
  ListChecks,
  Plus,
  ReceiptIndianRupee,
  Phone,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ResponsiveTabs, type TabItem } from '@/components/common/ResponsiveTabs'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInvoicePreview } from '@/hooks/react-query/billing'
import { useResourceAccess } from '@/hooks/useResourceAccess'
import { RESOURCE } from '@/lib/permissions/resourceKeys'
import type { Invoice } from '@/lib/types/billing'
import { cn } from '@/lib/utils'
import { GenerateInvoice } from './components/GenerateInvoice'
import { InvoicesList } from './components/InvoicesList'
import { MiscCharges } from './components/MiscCharges'
import { ReceiptsList } from './components/ReceiptsList'
import { UnbilledServices } from './components/UnbilledServices'
import { formatDay, formatInr } from './components/billingFormat'

/** One flat's billing: generate / edit invoices, invoices & payments, receipts, unbilled charges. */
export default function InvoicePage() {
  const { unitId = '' } = useParams()
  const navigate = useNavigate()
  const invoicesAccess = useResourceAccess(RESOURCE.BILLING_INVOICES)
  const receiptsAccess = useResourceAccess(RESOURCE.BILLING_RECEIPTS)
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(
    requestedTab === 'invoices' || !invoicesAccess.canCreate ? 'invoices' : 'generate',
  )
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  // The default monthly preview doubles as the flat summary (shared cache with the generate tab).
  const { data: flat, error } = useInvoicePreview(unitId, { billingMode: 'MONTHLY' })
  const outstanding = (flat?.pendingInvoices ?? []).reduce((s, p) => s + p.balance, 0)
  const tenantOccupied = (flat?.residents ?? []).some((r) => r.residentType === 'TENANT' && r.isResiding)

  const tabs: TabItem[] = [
    ...(invoicesAccess.canCreate || editingInvoice
      ? [
          {
            value: 'generate',
            label: editingInvoice ? `Edit Invoice (${editingInvoice.invoiceNumber})` : 'Generate Invoice',
            shortLabel: editingInvoice ? 'Edit' : 'Generate',
            icon: Plus,
            content: (
              <GenerateInvoice
                key={editingInvoice?.id ?? 'new'}
                unitId={unitId}
                editingInvoice={editingInvoice}
                onCancelEdit={() => setEditingInvoice(null)}
                onSaved={() => {
                  setEditingInvoice(null)
                  setActiveTab('invoices')
                }}
              />
            ),
          },
        ]
      : []),
    {
      value: 'invoices',
      label: 'Invoices',
      shortLabel: 'Invoices',
      icon: FileText,
      content: (
        <InvoicesList
          unitId={unitId}
          onEditInvoice={(inv) => {
            setEditingInvoice(inv)
            setActiveTab('generate')
          }}
        />
      ),
    },
    ...(receiptsAccess.canView
      ? [
          {
            value: 'receipts',
            label: 'Receipts',
            shortLabel: 'Receipts',
            icon: IndianRupee,
            content: <ReceiptsList unitId={unitId} />,
          },
        ]
      : []),
    {
      value: 'unbilled',
      label: 'Unbilled',
      shortLabel: 'Unbilled',
      icon: ListChecks,
      content: <UnbilledServices unitId={unitId} />,
    },
    {
      value: 'misc',
      label: 'Miscellaneous Charges',
      shortLabel: 'Misc',
      icon: ReceiptIndianRupee,
      content: <MiscCharges unitId={unitId} residents={flat?.residents ?? []} />,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={Home}
        title={flat ? `Flat ${flat.unitNumber}` : 'Flat billing'}
        description="Generate invoices, record payments and review unbilled charges for this flat."
        onBack={() => navigate('/admin/billing-management')}
      />

      {error ? (
        <Card className="bg-white/40">
          <CardContent className="py-10 text-center text-sm text-red-600">Could not load this flat.</CardContent>
        </Card>
      ) : (
        flat && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Household: who lives here and who pays */}
            <Card className="bg-white/60 lg:col-span-2">
              <CardContent className="pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#005390]" />
                  <h3 className="text-sm font-semibold text-gray-900">Household</h3>
                  <span className="text-xs text-gray-500">
                    {flat.residents.length + flat.familyMembers.length} people
                  </span>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                      tenantOccupied ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800',
                    )}
                  >
                    {tenantOccupied ? 'Tenant-occupied' : 'Owner-occupied'}
                  </span>
                </div>
                <div className="space-y-3">
                  {flat.residents.map((r) => {
                    const family = flat.familyMembers.filter((f) => f.residentId === r.id)
                    const isPayer = flat.billTo.residentId === r.id
                    return (
                      <div key={r.id} className="rounded-xl border border-gray-100 bg-white">
                        <div className="flex flex-wrap items-center gap-3 p-3">
                          <Initials name={r.name} tone={r.residentType === 'TENANT' ? 'purple' : 'sky'} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'font-semibold text-gray-900',
                                  !r.isResiding && 'text-gray-400 line-through',
                                )}
                              >
                                {r.name}
                              </span>
                              <RolePill tenant={r.residentType === 'TENANT'} />
                              {isPayer && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  Primary payer
                                </span>
                              )}
                            </div>
                            {r.phone && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                                <Phone className="h-3 w-3" />
                                {r.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-gray-100 px-3 py-2">
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Family members ({family.length})
                          </p>
                          {family.length === 0 ? (
                            <p className="pb-1 text-xs text-gray-400">No family members added</p>
                          ) : (
                            <Table className="w-full text-sm">
                              <TableHeader>
                                <TableRow className="text-left text-[11px] text-gray-400 border-none">
                                  <TableHead className="pb-1 h-auto font-medium">Name</TableHead>
                                  <TableHead className="pb-1 h-auto font-medium">Relation</TableHead>
                                  <TableHead className="pb-1 h-auto font-medium">Phone</TableHead>
                                  <TableHead className="pb-1 h-auto text-right font-medium">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {family.map((f) => (
                                  <TableRow key={f.id} className="border-t border-gray-50">
                                    <TableCell className="py-1.5">
                                      <span className="flex items-center gap-2">
                                        <Initials name={f.name} tone="gray" small />
                                        <span className="font-medium text-gray-800">{f.name}</span>
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-1.5 text-gray-600">{f.relation}</TableCell>
                                    <TableCell className="py-1.5 text-gray-600">{f.phone || '—'}</TableCell>
                                    <TableCell className="py-1.5 text-right">
                                      <span
                                        className={cn(
                                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                          f.isResiding ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500',
                                        )}
                                      >
                                        {f.isResiding ? 'Lives here' : 'Off-site'}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Key facts */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Fact
                icon={CalendarCheck}
                label="Moved in"
                value={flat.movedInDate ? formatDay(flat.movedInDate) : '—'}
              />
              <Fact icon={CalendarClock} label="Next unbilled day" value={formatDay(flat.nextBillableStartDate)} />
              <Fact
                icon={Wallet}
                label="Outstanding"
                value={formatInr(outstanding)}
                note={
                  flat.pendingInvoices.length
                    ? `${flat.pendingInvoices.length} unpaid invoice${flat.pendingInvoices.length > 1 ? 's' : ''}`
                    : 'All paid'
                }
                tone={outstanding > 0 ? 'text-amber-700' : 'text-emerald-700'}
              />
            </div>
          </div>
        )
      )}

      {unitId && (
        <ResponsiveTabs
          value={activeTab}
          onValueChange={(tab) => {
            if (tab !== 'generate' && editingInvoice) setEditingInvoice(null)
            setActiveTab(tab)
          }}
          className="flex w-full flex-1 flex-col"
          tabs={tabs}
        />
      )}
    </div>
  )
}

function RolePill({ tenant }: { tenant: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        tenant ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-sky-200 bg-sky-50 text-sky-700',
      )}
    >
      {tenant ? 'Tenant' : 'Owner'}
    </span>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
  note,
  tone = 'text-gray-900',
}: {
  icon: LucideIcon
  label: string
  value: string
  note?: string
  tone?: string
}) {
  return (
    <Card className="gap-0 flex flex-row items-center gap-3 rounded-2xl border-gray-100 bg-white p-4 shadow-2xs">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
        <Icon className="h-5 w-5" />
      </div>
      <CardContent className="min-w-0 p-0">
        <CardDescription className="text-xs text-gray-500">{label}</CardDescription>
        <CardTitle className={cn('text-base font-bold', tone)}>{value}</CardTitle>
        {note && <p className="text-[11px] text-gray-400">{note}</p>}
      </CardContent>
    </Card>
  )
}

function Initials({ name, tone, small }: { name: string; tone: 'sky' | 'purple' | 'gray'; small?: boolean }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        small ? 'h-6 w-6 text-[10px]' : 'h-10 w-10 text-sm',
        tone === 'sky' && 'bg-sky-100 text-sky-800',
        tone === 'purple' && 'bg-purple-100 text-purple-800',
        tone === 'gray' && 'bg-gray-100 text-gray-600',
      )}
    >
      {letters || '?'}
    </span>
  )
}
