import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUnbilledServices } from '@/hooks/react-query/billing'
import { formatDay, formatInr, SERVICE_TYPE_LABEL, toDayString } from './billingFormat'

/** Charges that are on no invoice yet, for any date range. */
export function UnbilledServices({ unitId }: { unitId: string }) {
  const today = new Date()
  const [startDate, setStartDate] = useState(toDayString(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [endDate, setEndDate] = useState(toDayString(today))
  const { data, isFetching } = useUnbilledServices(unitId, startDate, endDate)
  const services = data?.services ?? []

  return (
    <Card className="bg-white/60">
      <CardHeader className="gap-3">
        <CardTitle className="text-base">Unbilled charges</CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="mb-1 block text-xs text-gray-600">From</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-gray-600">To</Label>
            <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <p className="pb-2 text-sm text-gray-600">
            Total: <b>{formatInr(data?.total ?? 0)}</b>
          </p>
        </div>
        <p className="text-xs text-gray-500">Rent and packages are billed per period and are not listed here.</p>
      </CardHeader>
      <CardContent className="p-0">
        {isFetching ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#2b4f7e]" />
          </div>
        ) : services.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">Everything in this range has been billed.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatDay(s.date)}</TableCell>
                  <TableCell className="text-xs text-gray-500">{SERVICE_TYPE_LABEL[s.serviceType]}</TableCell>
                  <TableCell>
                    <p className="text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.description}</p>
                  </TableCell>
                  <TableCell className="text-right">{s.quantity}</TableCell>
                  <TableCell className="text-right font-medium">{formatInr(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
