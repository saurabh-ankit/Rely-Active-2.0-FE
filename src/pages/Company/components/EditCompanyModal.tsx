import { useState } from 'react'
import { AlertCircle, Building2, Plus, Trash2 } from 'lucide-react'
import CommonButton from '@/components/common/CommonButton'
import CommonInput from '@/components/common/CommonInput'
import CommonModal from '@/components/common/CommonModal'
import { TEXT_LIBRARY } from '@/constants/textLibrary'

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

interface FormErrors {
  companyName?: string
  email?: string
  contactNumber?: string
  altContactNumber?: string
  address?: string
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^[6-9][0-9]{9}$/

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

  const validatePhone = (val: string): string | undefined => {
    if (!val) return undefined
    if (!/^[6-9]/.test(val)) {
      return 'Contact number must start with a digit between 6-9'
    }
    if (val.length !== 10 || !phoneRegex.test(val)) {
      return TEXT_LIBRARY.VALIDATIONS.INVALID_CONTACT
    }
    return undefined
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!companyName.trim()) {
      newErrors.companyName = TEXT_LIBRARY.VALIDATIONS.COMPANY_NAME_REQUIRED
    }

    if (!email.trim()) {
      newErrors.email = TEXT_LIBRARY.VALIDATIONS.EMAIL_REQUIRED
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = TEXT_LIBRARY.VALIDATIONS.INVALID_EMAIL
    }

    if (!contactNumber.trim()) {
      newErrors.contactNumber = TEXT_LIBRARY.VALIDATIONS.CONTACT_REQUIRED
    } else {
      const err = validatePhone(contactNumber.trim())
      if (err) newErrors.contactNumber = err
    }

    if (altContactNumber.trim()) {
      const err = validatePhone(altContactNumber.trim())
      if (err) newErrors.altContactNumber = err
    }

    if (!address.trim()) {
      newErrors.address = TEXT_LIBRARY.VALIDATIONS.ADDRESS_REQUIRED
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('company_name', companyName.trim())
      formData.append('gst_number', gstNumber.trim())
      formData.append('email', email.trim())
      formData.append('contact_number', contactNumber.trim())
      formData.append('alternate_contact_number', altContactNumber.trim())
      formData.append('head_office_address', address.trim())

      formData.append('bank_name', bankName.trim())
      formData.append('branch_name', branchName.trim())
      formData.append('account_no', accountNo.trim())
      formData.append('ifsc_code', ifscCode.trim())

      formData.append('accountant_name', accountantName.trim())
      formData.append('document_description', docDescription.trim())

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
      const msg = error instanceof Error ? error.message : 'Failed to update company. Please try again.'
      if (msg.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: msg }))
      } else if (
        msg.toLowerCase().includes('contact number') ||
        msg.toLowerCase().includes('6-9') ||
        msg.toLowerCase().includes('10 digits')
      ) {
        setErrors((prev) => ({ ...prev, contactNumber: msg }))
      }
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalFooter = (
    <>
      <CommonButton variant="cancel" onClick={onClose} label={TEXT_LIBRARY.BUTTONS.CANCEL} />
      <CommonButton
        variant="success"
        type="submit"
        isLoading={isSubmitting}
        onClick={handleSubmit}
        label={isSubmitting ? TEXT_LIBRARY.BUTTONS.SAVING : TEXT_LIBRARY.BUTTONS.SAVE}
      />
    </>
  )

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={company?.id ? TEXT_LIBRARY.COMPANY.EDIT_TITLE : TEXT_LIBRARY.COMPANY.CREATE_TITLE}
      icon={<Building2 className="h-6 w-6 text-indigo-600" />}
      maxWidth="4xl"
      footer={modalFooter}
    >
      {/* Validation Error Alert */}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6 py-2">
        {/* Basic Details Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-100 pb-2">
            {TEXT_LIBRARY.COMPANY.BASIC_DETAILS}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CommonInput
              label={TEXT_LIBRARY.COMPANY.COMPANY_NAME}
              required
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value)
                if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: undefined }))
              }}
              error={errors.companyName}
              placeholder="Enter company name"
            />

            <CommonInput
              label={TEXT_LIBRARY.COMPANY.GST_NUMBER}
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="Enter GST number"
            />

            <CommonInput
              label={TEXT_LIBRARY.COMPANY.EMAIL}
              required
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              onBlur={() => {
                if (email.trim() && !emailRegex.test(email.trim())) {
                  setErrors((prev) => ({ ...prev, email: TEXT_LIBRARY.VALIDATIONS.INVALID_EMAIL }))
                }
              }}
              error={errors.email}
              placeholder="company@example.com"
            />

            <CommonInput
              label={TEXT_LIBRARY.COMPANY.CONTACT_NUMBER}
              required
              maxLength={10}
              value={contactNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setContactNumber(val)
                const err = validatePhone(val)
                setErrors((prev) => ({ ...prev, contactNumber: err }))
              }}
              onBlur={() => {
                const err = validatePhone(contactNumber.trim())
                if (err) setErrors((prev) => ({ ...prev, contactNumber: err }))
              }}
              error={errors.contactNumber}
              placeholder="10 digit mobile number"
            />

            <CommonInput
              label={TEXT_LIBRARY.COMPANY.ALT_CONTACT_NUMBER}
              maxLength={10}
              value={altContactNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setAltContactNumber(val)
                const err = validatePhone(val)
                setErrors((prev) => ({ ...prev, altContactNumber: err }))
              }}
              onBlur={() => {
                const err = validatePhone(altContactNumber.trim())
                if (err) setErrors((prev) => ({ ...prev, altContactNumber: err }))
              }}
              error={errors.altContactNumber}
              placeholder="10 digit mobile number"
            />

            <div className="md:col-span-2">
              <CommonInput
                label={TEXT_LIBRARY.COMPANY.HEAD_OFFICE_ADDRESS}
                required
                type="textarea"
                rows={2}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }))
                }}
                error={errors.address}
                placeholder="Enter complete head office address"
              />
            </div>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-100 pb-2">
            {TEXT_LIBRARY.COMPANY.BANK_DETAILS}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CommonInput
              label={TEXT_LIBRARY.COMPANY.BANK_NAME}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Bank name"
            />
            <CommonInput
              label={TEXT_LIBRARY.COMPANY.BRANCH_NAME}
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Branch name"
            />
            <CommonInput
              label={TEXT_LIBRARY.COMPANY.ACCOUNT_NO}
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
              placeholder="Account number"
            />
            <CommonInput
              label={TEXT_LIBRARY.COMPANY.IFSC_CODE}
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value)}
              placeholder="IFSC code"
            />
          </div>
        </div>

        {/* Files & Accountant Details */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-100 pb-2">
            {TEXT_LIBRARY.COMPANY.FILES_ACCOUNTANT}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CommonInput
              label={TEXT_LIBRARY.COMPANY.ACCOUNTANT_NAME}
              value={accountantName}
              onChange={(e) => setAccountantName(e.target.value)}
              placeholder="Accountant name"
            />

            <div>
              <span className="block text-xs font-medium text-gray-700 mb-1">{TEXT_LIBRARY.COMPANY.DOCUMENT_FILE}</span>
              <input
                type="file"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-700 mb-1">
                {TEXT_LIBRARY.COMPANY.ACCOUNTANT_SIGNATURE}
              </span>
              <input
                type="file"
                onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
              />
            </div>

            <CommonInput
              label={TEXT_LIBRARY.COMPANY.DOCUMENT_DESC}
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Document description"
            />
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-100 pb-2">
              {TEXT_LIBRARY.COMPANY.CUSTOM_FIELDS}
            </h3>
            <CommonButton
              variant="outline"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={addCustomField}
              label={TEXT_LIBRARY.BUTTONS.ADD_FIELD}
            />
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
      </form>
    </CommonModal>
  )
}
