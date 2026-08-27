import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Building2, Plus, Trash2, Upload, X } from 'lucide-react'
import CommonButton from '@/components/common/CommonButton'
import CommonInput from '@/components/common/CommonInput'
import type { CustomFieldItem } from '@/pages/Company/components/EditCompanyModal'
import { TEXT_LIBRARY } from '@/constants/textLibrary'
import { companyApi } from '@/api/company'
import { API_BASE_URL } from '@/api/api'

interface FormErrors {
  companyName?: string
  email?: string
  contactNumber?: string
  altContactNumber?: string
  address?: string
}

export default function SetupPage() {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

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
          navigate('/dashboard', { replace: true })
        }
      })
      .catch((err) => {
        console.warn('Initial setup check note:', err?.message || err)
      })
      .finally(() => {
        if (isMounted) setIsChecking(false)
      })

    return () => {
      isMounted = false
    }
  }, [navigate])

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

      const res = await fetch(`${API_BASE_URL}/company`, {
        method: 'POST',
        body: formData,
      })

      const resData = await res.json()

      if (!res.ok) {
        const msg = resData.message || 'Failed to create company'
        if (msg.toLowerCase().includes('email')) {
          setErrors((prev) => ({ ...prev, email: msg }))
        } else if (
          msg.toLowerCase().includes('contact number') ||
          msg.toLowerCase().includes('6-9') ||
          msg.toLowerCase().includes('10 digits')
        ) {
          setErrors((prev) => ({ ...prev, contactNumber: msg }))
        }
        throw new Error(msg)
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Failed to create company:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create company. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        fieldName: `field_${Date.now()}`,
        fieldLabel: '',
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

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking setup status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 py-12 font-sans text-gray-800">
      <div className="w-full max-w-4xl">
        {/* Main Title & Subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{TEXT_LIBRARY.APP.WELCOME_TITLE}</h1>
          <p className="text-gray-600">{TEXT_LIBRARY.APP.WELCOME_SUBTITLE}</p>
        </div>

        {/* Form Container Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-white/60">
          {/* Header inside Form Card */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{TEXT_LIBRARY.COMPANY.CREATE_TITLE}</h2>
            <p className="text-gray-600 text-sm">{TEXT_LIBRARY.COMPANY.CREATE_SUBTITLE}</p>
          </div>

          {/* Validation Error Alert Banner */}
          {errorMessage && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Company Name */}
            <CommonInput
              label={TEXT_LIBRARY.COMPANY.COMPANY_NAME}
              required
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value)
                if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: undefined }))
              }}
              error={errors.companyName}
              placeholder="Enter your company name"
            />

            {/* Email Address & Contact Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* GST Number & Alternate Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CommonInput
                label={TEXT_LIBRARY.COMPANY.GST_NUMBER}
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="Enter GST number"
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
            </div>

            {/* Head Office Address */}
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
              placeholder="Enter complete address"
            />

            {/* Document Upload */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">{TEXT_LIBRARY.COMPANY.DOCUMENT_FILE}</span>
              <div className="mt-1">
                {!documentFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload company registration or other documents</p>
                    <input
                      type="file"
                      id="document"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                    <label
                      htmlFor="document"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">{documentFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDocumentFile(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document Description */}
            <CommonInput
              label={TEXT_LIBRARY.COMPANY.DOCUMENT_DESC}
              type="textarea"
              rows={2}
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Describe the uploaded document"
            />

            {/* Bank Details */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">{TEXT_LIBRARY.COMPANY.BANK_DETAILS}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CommonInput
                  label={TEXT_LIBRARY.COMPANY.BANK_NAME}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Enter bank name"
                />
                <CommonInput
                  label={TEXT_LIBRARY.COMPANY.BRANCH_NAME}
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Enter branch name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CommonInput
                  label={TEXT_LIBRARY.COMPANY.ACCOUNT_NO}
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  placeholder="Enter account number"
                />
                <CommonInput
                  label={TEXT_LIBRARY.COMPANY.IFSC_CODE}
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  placeholder="Enter IFSC code"
                />
              </div>
            </div>

            {/* Accountant Details */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">{TEXT_LIBRARY.COMPANY.FILES_ACCOUNTANT}</h3>
              <CommonInput
                label={TEXT_LIBRARY.COMPANY.ACCOUNTANT_NAME}
                value={accountantName}
                onChange={(e) => setAccountantName(e.target.value)}
                placeholder="Enter accountant name"
              />

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  {TEXT_LIBRARY.COMPANY.ACCOUNTANT_SIGNATURE}
                </span>
                <div className="mt-1 space-y-3">
                  <input
                    type="file"
                    id="accountant_signature"
                    onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                  />

                  {signatureFile ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <img
                          src={URL.createObjectURL(signatureFile)}
                          alt="Preview"
                          className="w-16 h-16 object-contain rounded-lg border border-gray-200"
                        />
                        <span className="text-sm text-gray-700">{signatureFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSignatureFile(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="accountant_signature"
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer block"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Upload accountant signature</p>
                      <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Choose File
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{TEXT_LIBRARY.COMPANY.CUSTOM_FIELDS}</h3>
                  <p className="text-xs text-gray-500">Define additional fields for your company</p>
                </div>
                <CommonButton
                  variant="outline"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={addCustomField}
                  label={TEXT_LIBRARY.BUTTONS.ADD_FIELD}
                />
              </div>

              {customFields.length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">
                  No custom fields defined. Click "Add Field" to add custom fields.
                </p>
              ) : (
                <div className="space-y-3">
                  {customFields.map((field, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-3 rounded-lg border bg-gray-50 p-3">
                      <input
                        type="text"
                        placeholder="Field Label"
                        value={field.fieldLabel}
                        onChange={(e) => updateCustomField(idx, 'fieldLabel', e.target.value)}
                        className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white"
                      />

                      <select
                        value={field.fieldType}
                        onChange={(e) =>
                          updateCustomField(idx, 'fieldType', e.target.value as CustomFieldItem['fieldType'])
                        }
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white"
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
                        className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white"
                      />

                      <button
                        type="button"
                        onClick={() => removeCustomField(idx)}
                        className="p-1.5 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <CommonButton
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full py-3 text-sm"
                label={isSubmitting ? 'Creating Company...' : TEXT_LIBRARY.BUTTONS.CREATE_COMPANY}
              />
            </div>
          </form>
        </div>

        {/* Help Text Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Need help? Contact support or check our documentation for detailed setup instructions.</p>
        </div>
      </div>
    </div>
  )
}
