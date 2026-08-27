import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CreditCard, Download, Edit, Hash, Mail, MapPin, Phone, Plus, Trash2, UserCheck } from 'lucide-react'
import CommonButton from '@/components/common/CommonButton'
import CommonInput from '@/components/common/CommonInput'
import { Badge } from '@/components/ui/badge'
import EditCompanyModal from './components/EditCompanyModal'
import type { CompanyData, CustomFieldItem } from './components/EditCompanyModal'
import { TEXT_LIBRARY } from '@/constants/textLibrary'

import { companyApi } from '@/api/company'

interface FormErrors {
  companyName?: string
  email?: string
  contactNumber?: string
  altContactNumber?: string
  address?: string
}

export default function CompanyPage() {
  const navigate = useNavigate()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  // Full-page form state for initial creation
  const [companyName, setCompanyName] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [email, setEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [altContactNumber, setAltContactNumber] = useState('')
  const [address, setAddress] = useState('')

  const [bankName, setBankName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [ifscCode, setIfscCode] = useState('')

  const [accountantName, setAccountantName] = useState('')
  const [docDescription, setDocDescription] = useState('')

  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)

  const [customFields, setCustomFields] = useState<CustomFieldItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^[6-9][0-9]{9}$/

  useEffect(() => {
    let isMounted = true

    companyApi
      .getAll()
      .then((companies) => {
        if (!isMounted) return
        if (companies.length > 0) {
          setCompany(companies[0] as CompanyData)
        } else {
          setCompany(null)
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch company details note:', err)
        if (isMounted) {
          setCompany(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [reloadToken])

  const handleSaveCompanyModal = async (formData: FormData) => {
    try {
      await companyApi.saveFormData(formData, company?.id)
      setIsEditModalOpen(false)
      setReloadToken((prev) => prev + 1)
    } catch (err) {
      console.error('Error saving company:', err)
      throw err
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
      const phoneErr = validatePhone(contactNumber.trim())
      if (phoneErr) newErrors.contactNumber = phoneErr
    }

    if (altContactNumber.trim()) {
      const altErr = validatePhone(altContactNumber.trim())
      if (altErr) newErrors.altContactNumber = altErr
    }

    if (!address.trim()) {
      newErrors.address = TEXT_LIBRARY.VALIDATIONS.ADDRESS_REQUIRED
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFullPageSubmit = async (e: React.FormEvent) => {
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

      await companyApi.saveFormData(formData)
      navigate('/dashboard')
    } catch (error) {
      console.error('Failed to create company:', error)
      const msg = error instanceof Error ? error.message : 'Failed to create company'
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-indigo-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="text-sm font-medium">Loading company details...</span>
        </div>
      </div>
    )
  }

  // If no company exists, render FULL PAGE Company Setup Form (matching Assist)
  if (!company) {
    return (
      <div className="w-full space-y-6 pb-12">
        {/* Full Page Header */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{TEXT_LIBRARY.COMPANY.CREATE_TITLE}</h1>
              <p className="text-sm text-gray-500">{TEXT_LIBRARY.COMPANY.CREATE_SUBTITLE}</p>
            </div>
          </div>
        </div>

        {/* Full Page Form Card */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 md:p-8 shadow-xl backdrop-blur-xl">
          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleFullPageSubmit} noValidate className="space-y-8">
            {/* Basic Details */}
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
                    rows={3}
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

            {/* Bank Details */}
            <div className="space-y-4 pt-4">
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
            <div className="space-y-4 pt-4">
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

                <CommonInput
                  label={TEXT_LIBRARY.COMPANY.DOCUMENT_DESC}
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Document description"
                />

                <div>
                  <span className="block text-xs font-medium text-gray-700 mb-1">
                    {TEXT_LIBRARY.COMPANY.DOCUMENT_FILE}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                </div>

                <div>
                  <span className="block text-xs font-medium text-gray-700 mb-1">
                    {TEXT_LIBRARY.COMPANY.ACCOUNTANT_SIGNATURE}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                </div>
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
              <CommonButton
                type="submit"
                variant="success"
                isLoading={isSubmitting}
                label={isSubmitting ? TEXT_LIBRARY.BUTTONS.SAVING : TEXT_LIBRARY.BUTTONS.CREATE_COMPANY}
              />
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Company Details Display Mode
  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{company.company_name}</h1>
                <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                  Active
                </Badge>
              </div>
              <p className="text-sm text-gray-500">{TEXT_LIBRARY.COMPANY.SUBTITLE}</p>
            </div>
          </div>

          <CommonButton
            variant="primary"
            icon={<Edit className="h-4 w-4" />}
            onClick={() => setIsEditModalOpen(true)}
            label={TEXT_LIBRARY.BUTTONS.EDIT_COMPANY}
          />
        </div>
      </div>

      {/* Basic Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Email Address</span>
            <span className="text-sm font-medium text-gray-900">{company.email_id || '-'}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Primary Contact Number
            </span>
            <span className="text-sm font-medium text-gray-900">{company.contact_number || '-'}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">GST Number</span>
            <span className="text-sm font-medium text-gray-900">{company.company_gst_number || '-'}</span>
          </div>
        </div>
      </div>

      {/* Head Office & Bank Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Head Office */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <MapPin className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Head Office Address</h2>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-line">
            {company.company_head_office_address || 'No address details configured.'}
          </p>
        </div>

        {/* Bank Details */}
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Bank Details</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs text-gray-400">Bank Name</span>
              <span className="font-medium text-gray-800">{company.bank_name || '-'}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-400">Branch Name</span>
              <span className="font-medium text-gray-800">{company.branch_name || '-'}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-400">Account Number</span>
              <span className="font-medium text-gray-800">{company.account_no || '-'}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-400">IFSC Code</span>
              <span className="font-medium text-gray-800">{company.ifsc_code || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Files & Accountant Info */}
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <UserCheck className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Files & Accountant Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <span className="block text-xs text-gray-400">Accountant Name</span>
            <span className="font-medium text-gray-800">{company.accountant_name || '-'}</span>
          </div>

          <div>
            <span className="block text-xs text-gray-400 mb-1">Company Document</span>
            {company.document_path ? (
              <a
                href={`http://localhost:3002${company.document_path}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-xs bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100"
              >
                <Download className="h-3.5 w-3.5" />
                {company.document_name || 'Download File'}
              </a>
            ) : (
              <span className="text-gray-400 italic">No document uploaded</span>
            )}
          </div>

          <div>
            <span className="block text-xs text-gray-400 mb-1">Accountant Signature</span>
            {company.accountant_signature ? (
              <img
                src={`http://localhost:3002${company.accountant_signature}`}
                alt="Accountant Signature"
                className="h-16 max-w-[200px] object-contain rounded-xl border bg-white p-1"
              />
            ) : (
              <span className="text-gray-400 italic">No signature uploaded</span>
            )}
          </div>
        </div>
      </div>

      {/* Custom Fields List */}
      {company.customFields && company.customFields.length > 0 && (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Custom Configured Fields</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {company.customFields.map((cf, idx) => (
              <div key={idx} className="rounded-2xl border bg-gray-50/50 p-4">
                <span className="block text-xs font-semibold uppercase text-gray-400">
                  {cf.fieldLabel || cf.fieldName}
                </span>
                <span className="text-sm font-medium text-gray-800">{String(cf.fieldValue || '-')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for Editing */}
      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={company}
        onSave={handleSaveCompanyModal}
      />
    </div>
  )
}
