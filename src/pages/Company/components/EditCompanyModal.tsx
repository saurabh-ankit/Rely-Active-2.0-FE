import { useState } from 'react'
import { Building2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface CustomFieldItem {
  id?: string
  fieldName: string
  fieldLabel: string
  fieldType: 'text' | 'number' | 'date' | 'select' | 'bool' | 'document'
  fieldValue?: string
  enumValues?: string[]
  displayOrder?: number
}

export interface CompanyData {
  id?: string
  company_name: string
  company_gst_number?: string
  email_id: string
  contact_number: string
  alternate_contact_number?: string
  company_head_office_address: string
  document_name?: string
  document_description?: string
  document_path?: string
  bank_name?: string
  branch_name?: string
  account_no?: string
  ifsc_code?: string
  accountant_name?: string
  accountant_signature?: string
  customFields?: CustomFieldItem[]
}

interface EditCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  company: CompanyData | null
  onSave: (formData: FormData) => Promise<void>
}

export default function EditCompanyModal({ isOpen, onClose, company, onSave }: EditCompanyModalProps) {
  const [companyName, setCompanyName] = useState(company?.company_name || '')
  const [gstNumber, setGstNumber] = useState(company?.company_gst_number || '')
  const [email, setEmail] = useState(company?.email_id || '')
  const [contactNumber, setContactNumber] = useState(company?.contact_number || '')
  const [altContactNumber, setAltContactNumber] = useState(company?.alternate_contact_number || '')
  const [address, setAddress] = useState(company?.company_head_office_address || '')

  const [bankName, setBankName] = useState(company?.bank_name || '')
  const [branchName, setBranchName] = useState(company?.branch_name || '')
  const [accountNo, setAccountNo] = useState(company?.account_no || '')
  const [ifscCode, setIfscCode] = useState(company?.ifsc_code || '')

  const [accountantName, setAccountantName] = useState(company?.accountant_name || '')
  const [docDescription, setDocDescription] = useState(company?.document_description || '')

  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)

  const [customFields, setCustomFields] = useState<CustomFieldItem[]>(company?.customFields || [])

  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        fieldName: `field_${Date.now()}`,
        fieldLabel: 'New Field',
        fieldType: 'text',
        fieldValue: '',
        displayOrder: customFields.length + 1,
      },
    ])
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const updateCustomField = (
    index: number,
    key: keyof CustomFieldItem,
    value: string | number | boolean | string[],
  ) => {
    const updated = [...customFields]
    if (updated[index]) {
      updated[index] = { ...updated[index], [key]: value } as CustomFieldItem
      setCustomFields(updated)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('company_name', companyName)
      formData.append('gst_number', gstNumber)
      formData.append('email', email)
      formData.append('contact_number', contactNumber)
      formData.append('alternate_contact_number', altContactNumber)
      formData.append('head_office_address', address)

      formData.append('bank_name', bankName)
      formData.append('branch_name', branchName)
      formData.append('account_no', accountNo)
      formData.append('ifsc_code', ifscCode)

      formData.append('accountant_name', accountantName)
      formData.append('document_description', docDescription)

      if (documentFile) {
        formData.append('document', documentFile)
      }

      if (signatureFile) {
        formData.append('accountant_signature', signatureFile)
      }

      formData.append('customFields', JSON.stringify(customFields))

      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to update company:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-4xl rounded-3xl border border-white/30 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {company?.id ? 'Edit Company Information' : 'Create Company'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Main Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Company Name *</span>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">GST Number</span>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Email Address *</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Primary Contact Number *</span>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Alternate Contact Number</span>
                <input
                  type="text"
                  value={altContactNumber}
                  onChange={(e) => setAltContactNumber(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <span className="block text-xs font-medium text-gray-700 mb-1">Head Office Address *</span>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Bank Name</span>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Branch Name</span>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Account Number</span>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">IFSC Code</span>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Documents & Accountant */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Files & Accountant Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Accountant Name</span>
                <input
                  type="text"
                  value={accountantName}
                  onChange={(e) => setAccountantName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Company Document / Logo File</span>
                <input
                  type="file"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Accountant Signature File</span>
                <input
                  type="file"
                  onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">Document Description</span>
                <input
                  type="text"
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Custom Fields Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Custom Fields</h3>
              <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                <Plus className="h-4 w-4 mr-1" />
                Add Custom Field
              </Button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No custom fields added yet.</p>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-3 rounded-2xl bg-gray-50 p-3">
                    <input
                      type="text"
                      placeholder="Field Label"
                      value={field.fieldLabel}
                      onChange={(e) => updateCustomField(idx, 'fieldLabel', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-900 min-w-[120px]"
                    />

                    <select
                      value={field.fieldType}
                      onChange={(e) =>
                        updateCustomField(idx, 'fieldType', e.target.value as CustomFieldItem['fieldType'])
                      }
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-900"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                      <option value="bool">Boolean</option>
                      <option value="document">Document</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Field Value"
                      value={field.fieldValue || ''}
                      onChange={(e) => updateCustomField(idx, 'fieldValue', e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-900 min-w-[140px]"
                    />

                    <button
                      type="button"
                      onClick={() => removeCustomField(idx)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Company Details'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
