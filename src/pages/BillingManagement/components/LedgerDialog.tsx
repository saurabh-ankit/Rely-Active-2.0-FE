import React from 'react'
import { BookOpen, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useGetAccountLedger } from '@/hooks/react-query/billing'
import { formatDateDDMMYYYY } from '@/lib/utils/dateFormat'

interface LedgerDialogProps {
  accountId: string | null
  accountNumber?: string
  accountName?: string
  isOpen: boolean
  onClose: () => void
}

export const LedgerDialog: React.FC<LedgerDialogProps> = ({
  accountId,
  accountNumber,
  accountName,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null

  const { data, isLoading } = useGetAccountLedger(accountId || '', undefined, isOpen && !!accountId)
  const statement = data?.data
  const entries = Array.isArray(statement)
    ? statement
    : Array.isArray(statement?.entries)
    ? statement.entries
    : []
  const creditBalance = statement && !Array.isArray(statement) && typeof statement.creditBalance === 'number'
    ? statement.creditBalance
    : 0


  const getEntryTypeBadge = (type: string) => {
    switch (type) {
      case 'INVOICE':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">INVOICE (DEBIT)</Badge>
      case 'PAYMENT':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">PAYMENT (CREDIT)</Badge>
      case 'CREDIT_NOTE':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">CREDIT NOTE</Badge>
      case 'DEBIT_NOTE':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">DEBIT NOTE</Badge>
      case 'CREDIT_APPLIED':
        return <Badge className="bg-teal-100 text-teal-800 border-teal-200">CREDIT APPLIED</Badge>
      case 'REFUND':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">REFUND</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#005390]" />
                Sacred Ledger Statement: {accountNumber || accountName || 'Folio'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Append-only immutable audit trail of all financial transactions.
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Unapplied Credit</div>
              <div className="text-sm font-bold text-emerald-600 font-mono">
                ₹{Number(creditBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading ledger statement...</div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            No ledger transactions recorded yet for this folio.
          </div>
        ) : (
          <div className="pt-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-right">Debit (₹)</th>
                    <th className="px-3 py-3 text-right">Credit (₹)</th>
                    <th className="px-4 py-3 text-right">Running Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                        {formatDateDDMMYYYY(entry.entryDate)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getEntryTypeBadge(entry.entryType)}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        <div className="font-medium">{entry.description}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          Ref: {entry.referenceType} ({entry.referenceId.slice(0, 8)}...)
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-red-600 whitespace-nowrap">
                        {Number(entry.debitAmount) > 0
                          ? `₹${Number(entry.debitAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-emerald-600 whitespace-nowrap">
                        {Number(entry.creditAmount) > 0
                          ? `₹${Number(entry.creditAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                        <span
                          className={
                            Number(entry.runningBalance) > 0
                              ? 'text-red-700'
                              : Number(entry.runningBalance) < 0
                                ? 'text-emerald-700'
                                : 'text-gray-700'
                          }
                        >
                          ₹{Number(entry.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          {Number(entry.runningBalance) > 0 ? ' Dr' : Number(entry.runningBalance) < 0 ? ' Cr' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

