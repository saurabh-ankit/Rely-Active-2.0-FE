/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Building2, CreditCard, Download, Edit, Hash, Mail, MapPin, Phone, Plus, Trash2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { z } from 'zod'
import EditCompanyModal from './components/EditCompanyModal'
import type { CompanyData, CustomFieldItem } from './components/EditCompanyModal'
import { TEXT_LIBRARY } from '@/lib/constants/textLibrary'

import { getCompaniesAPI, saveCompanyFormDataAPI } from '@/lib/services/companyService'

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_REGEX = /^[6-9][0-9]{9}$/
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

export const companySchema = z.object({
  company_name: z.string().trim().min(1, TEXT_LIBRARY.VALIDATIONS.COMPANY_NAME_REQUIRED),
  company_gst_number: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || GST_REGEX.test(val.trim().toUpperCase()), {
      message: 'Invalid GST number format (e.g. 22AAAAA0000A1Z5)',
    }),
  email_id: z
    .string()
    .trim()
    .min(1, TEXT_LIBRARY.VALIDATIONS.EMAIL_REQUIRED)
    .refine((val) => EMAIL_REGEX.test(val), {
      message: TEXT_LIBRARY.VALIDATIONS.INVALID_EMAIL,
    }),
  contact_number: z
    .string()
    .trim()
    .min(1, TEXT_LIBRARY.VALIDATIONS.CONTACT_REQUIRED)
    .refine((val) => PHONE_REGEX.test(val), {
      message: 'Contact number must start with a digit between 6-9 and be exactly 10 digits',
    }),
  alternate_contact_number: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || PHONE_REGEX.test(val.trim()), {
      message: 'Contact number must start with a digit between 6-9 and be exactly 10 digits',
    }),
  company_head_office_address: z.string().trim().min(1, TEXT_LIBRARY.VALIDATIONS.ADDRESS_REQUIRED),
  document_name: z.string().optional(),
  document_description: z.string().optional(),
  bank_name: z.string().optional(),
  branch_name: z.string().optional(),
  account_no: z.string().optional(),
  ifsc_code: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || IFSC_REGEX.test(val.trim().toUpperCase()), {
      message: 'Invalid IFSC code format (e.g. SBIN0001234)',
    }),
  accountant_name: z.string().optional(),
})

export type CompanyFormValues = z.infer<typeof companySchema>

export default function CompanyPage() {
  const navigate = useNavigate()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: '',
      company_gst_number: '',
      email_id: '',
      contact_number: '',
      alternate_contact_number: '',
      company_head_office_address: '',
      bank_name: '',
      branch_name: '',
      account_no: '',
      ifsc_code: '',
      accountant_name: '',
      document_description: '',
    },
  })

  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)

  const [customFields, setCustomFields] = useState<CustomFieldItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    getCompaniesAPI()
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
      await saveCompanyFormDataAPI(formData, company?.id)
      setIsEditModalOpen(false)
      setReloadToken((prev) => prev + 1)
    } catch (err) {
      console.error('Error saving company:', err)
      throw err
    }
  }

  const onFullPageSubmit = async (values: CompanyFormValues) => {
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('company_name', values.company_name.trim())
      formData.append('gst_number', (values.company_gst_number || '').trim())
      formData.append('email', values.email_id.trim())
      formData.append('contact_number', values.contact_number.trim())
      formData.append('alternate_contact_number', (values.alternate_contact_number || '').trim())
      formData.append('head_office_address', values.company_head_office_address.trim())

      formData.append('bank_name', (values.bank_name || '').trim())
      formData.append('branch_name', (values.branch_name || '').trim())
      formData.append('account_no', (values.account_no || '').trim())
      formData.append('ifsc_code', (values.ifsc_code || '').trim())

      formData.append('accountant_name', (values.accountant_name || '').trim())
      formData.append('document_description', (values.document_description || '').trim())

      if (documentFile) {
        formData.append('document', documentFile)
      }

      if (signatureFile) {
        formData.append('accountant_signature', signatureFile)
      }

      formData.append('customFields', JSON.stringify(customFields))

      await saveCompanyFormDataAPI(formData)
      navigate('/dashboard')
    } catch (error) {
      console.error('Failed to create company:', error)
      const msg = error instanceof Error ? error.message : 'Failed to create company'
      if (msg.toLowerCase().includes('email')) {
        setError('email_id', { message: msg })
      } else if (
        msg.toLowerCase().includes('contact number') ||
        msg.toLowerCase().includes('6-9') ||
        msg.toLowerCase().includes('10 digits')
      ) {
        setError('contact_number', { message: msg })
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

          <form onSubmit={handleSubmit(onFullPageSubmit)} noValidate className="space-y-8">
            {/* Basic Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b border-gray-100 pb-2">
                {TEXT_LIBRARY.COMPANY.BASIC_DETAILS}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={TEXT_LIBRARY.COMPANY.COMPANY_NAME}
                  required
                  {...register('company_name')}
                  error={errors.company_name?.message}
                  placeholder="Enter company name"
                />

                <Input
                  label={TEXT_LIBRARY.COMPANY.GST_NUMBER}
                  {...register('company_gst_number')}
                  error={errors.company_gst_number?.message}
                  placeholder="Enter GST number"
                />

                <Input
                  label={TEXT_LIBRARY.COMPANY.EMAIL}
                  required
                  type="email"
                  {...register('email_id')}
                  error={errors.email_id?.message}
                  placeholder="company@example.com"
                />

                <Input
                  label={TEXT_LIBRARY.COMPANY.CONTACT_NUMBER}
                  required
                  maxLength={10}
                  {...register('contact_number')}
                  error={errors.contact_number?.message}
                  placeholder="10 digit mobile number"
                />

                <Input
                  label={TEXT_LIBRARY.COMPANY.ALT_CONTACT_NUMBER}
                  maxLength={10}
                  {...register('alternate_contact_number')}
                  error={errors.alternate_contact_number?.message}
                  placeholder="10 digit mobile number"
                />

                <div className="md:col-span-2">
                  <Input
                    label={TEXT_LIBRARY.COMPANY.HEAD_OFFICE_ADDRESS}
                    required
                    type="textarea"
                    rows={3}
                    {...register('company_head_office_address')}
                    error={errors.company_head_office_address?.message}
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
                <Input label={TEXT_LIBRARY.COMPANY.BANK_NAME} {...register('bank_name')} placeholder="Bank name" />

                <Input
                  label={TEXT_LIBRARY.COMPANY.BRANCH_NAME}
                  {...register('branch_name')}
                  placeholder="Branch name"
                />

                <Input
                  label={TEXT_LIBRARY.COMPANY.ACCOUNT_NO}
                  {...register('account_no')}
                  placeholder="Account number"
                />

                <Input
                  label={TEXT_LIBRARY.COMPANY.IFSC_CODE}
                  {...register('ifsc_code')}
                  error={errors.ifsc_code?.message}
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
                <Input
                  label={TEXT_LIBRARY.COMPANY.ACCOUNTANT_NAME}
                  {...register('accountant_name')}
                  placeholder="Accountant name"
                />

                <Input
                  label={TEXT_LIBRARY.COMPANY.DOCUMENT_DESC}
                  {...register('document_description')}
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

            {/* Custom Fields */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {TEXT_LIBRARY.COMPANY.CUSTOM_FIELDS}
                </h3>
                <Button
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
              <Button
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

          <Button
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
