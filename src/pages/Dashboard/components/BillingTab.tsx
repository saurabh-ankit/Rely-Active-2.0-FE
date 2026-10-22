import {
  AlertCircle,
  CreditCard,
  FileText,
  HandCoins,
  IndianRupee,
  Package,
  Percent,
  Receipt,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { DashboardBilling } from '@/lib/types/dashboard'
import { AXIS_TICK, GRID, SERIES, formatINR, formatINRCompact, formatNumber, monthLabel } from './chartUtils'
import { Donut, EmptyChart, Meter, Panel, StatTile } from './shared'

const monthlyConfig = {
  billed: { label: 'Billed', color: SERIES[0] },
  collected: { label: 'Collected', color: SERIES[1] },
} satisfies ChartConfig

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  NET_BANKING: 'Net banking',
  OTHER: 'Other',
}

export function BillingTab({ data }: { data: DashboardBilling }) {
  const navigate = useNavigate()
  const hasMonthly = data.monthly.some((m) => m.billed || m.collected)
  const statusRows = [
    { label: 'Paid', value: data.statusCounts.paid },
    { label: 'Partly paid', value: data.statusCounts.partiallyPaid },
    { label: 'Pending', value: data.statusCounts.pending },
    { label: 'Overdue', value: data.statusCounts.overdue },
    { label: 'Carried forward', value: data.statusCounts.carriedForward },
    { label: 'Draft', value: data.statusCounts.draft },
  ]
  const maxStatus = Math.max(1, ...statusRows.map((r) => r.value))
  const maxDue = Math.max(1, ...data.topOutstanding.map((t) => t.due))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={IndianRupee}
          label="Total billed"
          value={formatINRCompact(data.totalBilled)}
          hint={formatINR(data.totalBilled)}
        />
        <StatTile
          icon={Wallet}
          tone="green"
          label="Collected"
          value={formatINRCompact(data.totalCollected)}
          hint={`${formatNumber(data.receipts)} receipts`}
        />
        <StatTile
          icon={HandCoins}
          tone="amber"
          label="Outstanding"
          value={formatINRCompact(data.outstanding)}
          hint={formatINR(data.outstanding)}
        />
        <StatTile
          icon={AlertCircle}
          tone="red"
          label="Overdue"
          value={formatINRCompact(data.overdue)}
          hint={`${data.statusCounts.overdue} invoices`}
        />
        <StatTile
          icon={Percent}
          tone="violet"
          label="Collection rate"
          value={`${data.collectionRate}%`}
          hint="Collected of billed"
        />
        <StatTile
          icon={FileText}
          tone="slate"
          label="Invoices"
          value={formatNumber(data.invoiceCount)}
          hint="Open billing"
          onClick={() => navigate('/admin/billing-management')}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={IndianRupee}
          title="Billed vs collected"
          subtitle="Last 6 months: invoices by billing month, payments by date received"
          className="xl:col-span-2"
        >
          {hasMonthly ? (
            <ChartContainer config={monthlyConfig} className="aspect-auto h-72 w-full">
              <BarChart data={data.monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                <YAxis tickFormatter={formatINRCompact} tickLine={false} axisLine={false} tick={AXIS_TICK} width={56} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => monthLabel(String(v))}
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {monthlyConfig[name as keyof typeof monthlyConfig]?.label ?? name}
                          </span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatINR(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="billed" fill="var(--color-billed)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart message="No invoices or payments in the last 6 months" />
          )}
        </Panel>

        <Panel icon={FileText} title="Invoices by status" subtitle={`${formatNumber(data.invoiceCount)} invoices`}>
          {data.invoiceCount ? (
            <div className="space-y-3">
              {statusRows.map((r) => (
                <Meter key={r.label} label={r.label} value={r.value} max={maxStatus} />
              ))}
            </div>
          ) : (
            <EmptyChart message="No invoices yet" />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel icon={CreditCard} title="Payments by method" subtitle="All payments received">
          <Donut
            centerLabel="collected"
            format={formatINRCompact}
            centerValue={formatINRCompact(data.totalCollected)}
            data={data.paymentMethods.slice(0, 8).map((p, i) => ({
              key: p.method,
              label: `${METHOD_LABEL[p.method] ?? p.method} · ${p.count}`,
              value: p.amount,
              color: SERIES[i]!,
            }))}
          />
        </Panel>

        <Panel icon={AlertCircle} title="Highest outstanding" subtitle="Flats with the most unpaid balance">
          {data.topOutstanding.length ? (
            <div className="space-y-3">
              {data.topOutstanding.map((t) => (
                <Meter
                  key={`${t.unit}-${t.name}`}
                  label={`${t.unit ? `Flat ${t.unit}` : 'No flat'}${t.name ? ` · ${t.name}` : ''}`}
                  value={t.due}
                  max={maxDue}
                  color={SERIES[1]}
                  display={formatINR(t.due)}
                />
              ))}
            </div>
          ) : (
            <EmptyChart message="Nothing outstanding" />
          )}
        </Panel>

        <Panel icon={Package} title="Active packages" subtitle="Care and food packages being billed">
          <div className="grid grid-cols-2 gap-2.5 text-[11px] text-gray-500">
            <div className="rounded-xl border border-gray-100 bg-white/70 p-3">
              <div className="text-xl font-black text-[#1f2937]">{formatNumber(data.subscriptions.carePackages)}</div>
              Care packages
              <div className="mt-1 font-semibold text-gray-600">{formatINR(data.subscriptions.carePackagesValue)}</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white/70 p-3">
              <div className="text-xl font-black text-[#1f2937]">{formatNumber(data.subscriptions.foodPackages)}</div>
              Food packages
              <div className="mt-1 font-semibold text-gray-600">{formatINR(data.subscriptions.foodPackagesValue)}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-sky-50/70 p-3 text-[11px] text-sky-800">
            <Receipt className="h-4 w-4 shrink-0" />
            Package value is the total of each active package&apos;s price.
          </div>
        </Panel>
      </div>
    </div>
  )
}
