import React, { useState } from 'react'
import { X, FileText, Upload, Check } from 'lucide-react'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { Ticket } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  ticket: Ticket | null
  locationId: string | null
  onSuccess: () => void
}

export function AddInvoiceModal({ isOpen, onClose, ticket, locationId, onSuccess }: Props) {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [materialCost, setMaterialCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !ticket) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('invoiceNumber', invoiceNumber)
      formData.append('amount', amount)
      formData.append('materialCost', materialCost)
      formData.append('laborCost', laborCost)
      formData.append('notes', notes)
      if (file) formData.append('attachment', file)

      const url = API_ENDPOINTS.tickets.updateOptions(ticket.id, locationId)
      await apiClient.patch(url, {
        resolutionNotes:
          `Invoice #${invoiceNumber || 'N/A'} - Total: ₹${amount || '0'} (Materials: ₹${materialCost || '0'}, Labor: ₹${laborCost || '0'}). ${notes}`.trim(),
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save invoice details:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-[#f28e53]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Add Invoice Details</h2>
              <p className="text-xs text-gray-500 font-mono">Ticket #{ticket.ticketNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-number" className="block text-xs font-bold text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                id="inv-number"
                type="text"
                placeholder="e.g. INV-2026-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#f28e53]"
              />
            </div>
            <div>
              <label htmlFor="inv-amount" className="block text-xs font-bold text-gray-700 mb-1">
                Total Amount (₹) *
              </label>
              <input
                id="inv-amount"
                type="number"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#f28e53]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-material" className="block text-xs font-bold text-gray-700 mb-1">
                Material Cost (₹)
              </label>
              <input
                id="inv-material"
                type="number"
                placeholder="0.00"
                value={materialCost}
                onChange={(e) => setMaterialCost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#f28e53]"
              />
            </div>
            <div>
              <label htmlFor="inv-labor" className="block text-xs font-bold text-gray-700 mb-1">
                Labor / Service Cost (₹)
              </label>
              <input
                id="inv-labor"
                type="number"
                placeholder="0.00"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#f28e53]"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-gray-700 mb-1">Upload Invoice Attachment</span>
            <div className="border border-dashed border-gray-200 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
              <input
                type="file"
                id="invoice-file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              />
              <label
                htmlFor="invoice-file"
                className="cursor-pointer flex items-center justify-center gap-2 text-xs text-gray-600 font-semibold"
              >
                <Upload className="w-4 h-4 text-[#f28e53]" />
                {file ? file.name : 'Click to select bill or receipt PDF/image'}
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="inv-notes" className="block text-xs font-bold text-gray-700 mb-1">
              Notes / Spare Parts Used
            </label>
            <textarea
              id="inv-notes"
              rows={2}
              placeholder="Provide breakdown of replacement parts or service comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#f28e53] resize-none"
            />
          </div>

          {/* Footer CTA */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#f28e53] hover:bg-[#e07b40] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
