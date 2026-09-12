import React, { useState } from 'react'
import {
  FileText,
  User,
  Home,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Building,
  CreditCard,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGetInvoiceById } from '@/hooks/react-query/billing'

interface InvoiceDetailDialogProps {
  invoiceId: string | null
  isOpen: boolean
  onClose: () => void
}

export const InvoiceDetailDialog: React.FC<InvoiceDetailDialogProps> = ({
  invoiceId,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const { data, isLoading } = useGetInvoiceById(invoiceId || '', isOpen && !!invoiceId)
  const invoice = data?.data

  const handleCopyInvoiceNumber = () => {
    if (!invoice?.invoiceNumber) return
    navigator.clipboard.writeText(invoice.invoiceNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-2.5 py-0.5">
            PAID
          </Badge>
        )
      case 'PARTIALLY_PAID':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold px-2.5 py-0.5">
            PARTIALLY PAID
          </Badge>
        )
      case 'FINALIZED':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold px-2.5 py-0.5">
            FINALIZED
          </Badge>
        )
      case 'DRAFT':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold px-2.5 py-0.5">
            DRAFT
          </Badge>
        )
      case 'OVERDUE':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 font-bold px-2.5 py-0.5">
            OVERDUE
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="font-bold px-2.5 py-0.5">
            {status || 'UNKNOWN'}
          </Badge>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full max-h-[92vh] p-0 flex flex-col overflow-hidden bg-white border-gray-200 shadow-2xl rounded-2xl gap-0">
        {/* MODAL ACTION BAR */}
        <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#005390]/10 text-[#005390]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-gray-900 font-mono">
                  {invoice?.invoiceNumber || 'Tax Invoice'}
                </DialogTitle>
                {invoice?.invoiceNumber && (
                  <button
                    type="button"
                    onClick={handleCopyInvoiceNumber}
                    title="Copy Invoice Number"
                    className="text-gray-400 hover:text-gray-700 cursor-pointer transition-colors p-1"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                {getStatusBadge(invoice?.status)}
              </div>
              <DialogDescription className="text-xs text-gray-500">
                Issued: {invoice?.issueDate || '-'} • Due: {invoice?.dueDate || '-'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 cursor-pointer bg-white hover:bg-slate-50 text-gray-700 border-gray-300 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* BODY CONTAINER */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 bg-white space-y-6">
          {isLoading ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-7 h-7 border-2 border-[#005390] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Loading invoice details...</p>
            </div>
          ) : !invoice ? (
            <div className="py-20 text-center text-red-500 text-sm">Invoice not found.</div>
          ) : (
            <>
              {/* PRINTABLE INVOICE SHEET HEADER */}
              <div className="border-b border-gray-200 pb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  {/* Left: Entity / Community Logo & Name */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#005390] text-white flex items-center justify-center font-bold text-sm">
                        R
                      </div>
                      <span className="font-extrabold text-lg tracking-tight text-gray-900">
                        RELY ACTIVE <span className="text-[#005390]">2.0</span>
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-700">Green Valley Residency</p>
                    <p className="text-[11px] text-gray-500 max-w-sm leading-relaxed">
                      Integrated Senior Living & Community Management • Residential Billing & Accounting
                    </p>
                  </div>

                  {/* Right: Legal Tax Invoice Meta */}
                  <div className="sm:text-right space-y-1">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-gray-800 text-xs font-extrabold tracking-wider uppercase rounded">
                      Tax Invoice
                    </span>
                    <div className="text-sm font-mono font-bold text-[#005390]">
                      #{invoice.invoiceNumber}
                    </div>
                    <div className="text-xs text-gray-600">
                      Billing Period: <span className="font-medium text-gray-900">{invoice.periodStart}</span> to{' '}
                      <span className="font-medium text-gray-900">{invoice.periodEnd}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Master Folio: <span className="font-mono font-semibold text-gray-700">{invoice.billingAccount?.accountNumber || invoice.billingAccountId}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BILLED TO & PROPERTY CONTEXT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Billed To */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#005390]" /> Billed To (Primary Payer)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white text-blue-700 border-blue-200">
                      Primary
                    </Badge>
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="text-sm font-bold text-gray-950">{invoice.billToName}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Home className="w-3.5 h-3.5 text-gray-400" />
                      <span>Unit / Flat: <strong className="text-gray-900">{invoice.unit?.unit_number || 'A-14'}</strong></span>
                    </div>
                    {invoice.billToPhone && (
                      <div className="text-xs text-gray-600">
                        Phone: <span className="font-mono text-gray-800">{invoice.billToPhone}</span>
                      </div>
                    )}
                    {invoice.billToEmail && (
                      <div className="text-xs text-gray-600">
                        Email: <span className="text-gray-800">{invoice.billToEmail}</span>
                      </div>
                    )}
                    {invoice.billToGstin && (
                      <div className="text-xs font-mono font-semibold text-indigo-700 pt-0.5">
                        GSTIN: {invoice.billToGstin}
                      </div>
                    )}
                  </div>
                </div>

                {/* Property & Invoice Terms */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-purple-600" /> Invoice Dates & Settlement
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" /> Certified
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-gray-500 block">Invoice Date:</span>
                      <span className="font-semibold text-gray-900">{invoice.issueDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Payment Due Date:</span>
                      <span className="font-semibold text-rose-700">{invoice.dueDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Currency:</span>
                      <span className="font-semibold text-gray-900">INR (₹)</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Status:</span>
                      <span className="font-semibold text-gray-900">{invoice.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ITEMIZED CHARGES TABLE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Itemized Particulars ({invoice.lines?.length || 0} Items)
                  </h4>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-slate-50 text-gray-600 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-3 text-center w-10">#</th>
                        <th className="px-4 py-3 text-left">Description & Category</th>
                        <th className="px-3 py-3 text-left">Consumer</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3 text-right">Rate (₹)</th>
                        <th className="px-3 py-3 text-right">Taxable (₹)</th>
                        <th className="px-3 py-3 text-right">GST Rate</th>
                        <th className="px-4 py-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {invoice.lines && invoice.lines.length > 0 ? (
                        invoice.lines.map((line, idx) => (
                          <tr key={line.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-3 text-center text-gray-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              <div className="font-semibold text-gray-900">{line.description}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-100 text-gray-600 font-medium">
                                  {line.lineType}
                                </span>
                                {line.chargeType && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    • {line.chargeType}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                              {line.consumedByResident
                                ? `${line.consumedByResident.firstName} ${line.consumedByResident.lastName}`
                                : 'Mahesh Sinha'}
                            </td>
                            <td className="px-3 py-3 text-right text-gray-700 font-mono">
                              {Number(line.quantity).toFixed(line.quantity % 1 === 0 ? 0 : 2)}
                            </td>
                            <td className="px-3 py-3 text-right text-gray-700 font-mono">
                              ₹{Number(line.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3 text-right text-gray-800 font-mono">
                              ₹{Number(line.taxableAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              {Number(line.taxRate) > 0 ? (
                                <span className="text-amber-700 font-mono font-semibold">
                                  {Number(line.taxRate)}%{' '}
                                  <span className="text-gray-400 font-normal">
                                    (₹{Number(line.taxAmount).toFixed(2)})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-gray-400 font-medium">Exempt (0%)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                              ₹{Number(line.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                            No itemized charges listed on this invoice.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FINANCIAL RECONCILIATION BREAKDOWN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Terms / Bank / Notes */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 text-xs space-y-2 text-gray-500">
                  <div className="font-bold text-gray-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#005390]" /> Payment & Settlement Terms
                  </div>
                  <p className="leading-relaxed">
                    1. Please settle the invoice on or before the due date to avoid late charges.
                  </p>
                  <p className="leading-relaxed">
                    2. Cheques / NEFT / RTGS transfers can be made in favour of <strong>Green Valley Residency Maintenance A/c</strong>.
                  </p>
                  <p className="leading-relaxed">
                    3. Billed usage events are audited and permanently journalized in the unit's Sacred Ledger.
                  </p>
                </div>

                {/* Totals Table */}
                <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-xl border border-slate-200 text-xs space-y-2.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-semibold text-gray-900">
                      ₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {Number(invoice.discountTotal) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount:</span>
                      <span className="font-mono">
                        -₹{Number(invoice.discountTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Total GST:</span>
                    <span className="font-mono font-semibold text-gray-900">
                      ₹{Number(invoice.taxTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {Number(invoice.roundingAdjustment) !== 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Rounding Adjustment:</span>
                      <span className="font-mono">
                        {Number(invoice.roundingAdjustment) > 0 ? '+' : ''}
                        ₹{Number(invoice.roundingAdjustment).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="border-t-2 border-gray-200 pt-3 flex justify-between items-baseline text-sm font-bold text-gray-900">
                    <span className="text-gray-800">Grand Total:</span>
                    <span className="text-xl font-mono font-extrabold text-[#005390]">
                      ₹{Number(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-600 pt-1">
                    <span>Amount Paid:</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      ₹{Number(invoice.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold pt-2.5 border-t border-dashed border-gray-200">
                    <span className="text-gray-800">Balance Due:</span>
                    <span
                      className={`font-mono px-2.5 py-0.5 rounded-md ${
                        Number(invoice.amountDue) > 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      ₹{Number(invoice.amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 bg-slate-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Computer generated legal tax invoice • No physical signature required</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs cursor-pointer h-8"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs cursor-pointer h-8 bg-[#005390] hover:bg-[#004273] text-white"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
