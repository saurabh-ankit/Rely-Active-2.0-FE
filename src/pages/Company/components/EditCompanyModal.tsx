import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Building2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TEXT_LIBRARY } from '@/lib/constants/textLibrary'
import { companySchema, type CompanyFormValues } from '../index'

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
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [customFields, setCustomFields] = useState<CustomFieldItem[]>(company?.customFields || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: company?.company_name || '',
      company_gst_number: company?.company_gst_number || '',
      email_id: company?.email_id || '',
      contact_number: company?.contact_number || '',
      alternate_contact_number: company?.alternate_contact_number || '',
      company_head_office_address: company?.company_head_office_address || '',
      bank_name: company?.bank_name || '',
      branch_name: company?.branch_name || '',
      account_no: company?.account_no || '',
      ifsc_code: company?.ifsc_code || '',
      accountant_name: company?.accountant_name || '',
      document_description: company?.document_description || '',
    },
  })

  useEffect(() => {
    if (company) {
      reset({
        company_name: company.company_name || '',
        company_gst_number: company.company_gst_number || '',
        email_id: company.email_id || '',
        contact_number: company.contact_number || '',
        alternate_contact_number: company.alternate_contact_number || '',
        company_head_office_address: company.company_head_office_address || '',
        bank_name: company.bank_name || '',
        branch_name: company.branch_name || '',
        account_no: company.account_no || '',
        ifsc_code: company.ifsc_code || '',
        accountant_name: company.accountant_name || '',
        document_description: company.document_description || '',
      })
      const timer = setTimeout(() => {
        setCustomFields(company.customFields || [])
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [company, reset])

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

  const onSubmit = async (values: CompanyFormValues) => {
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

      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to update company:', error)
      const msg = error instanceof Error ? error.message : 'Failed to update company. Please try again.'
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {company?.id ? TEXT_LIBRARY.COMPANY.EDIT_TITLE : TEXT_LIBRARY.COMPANY.CREATE_TITLE}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Validation Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 py-2">
          {/* Basic Details Section */}
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
                  rows={2}
                  {...register('company_head_office_address')}
                  error={errors.company_head_office_address?.message}
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
              <Input label={TEXT_LIBRARY.COMPANY.BANK_NAME} {...register('bank_name')} placeholder="Bank name" />
              <Input label={TEXT_LIBRARY.COMPANY.BRANCH_NAME} {...register('branch_name')} placeholder="Branch name" />
              <Input label={TEXT_LIBRARY.COMPANY.ACCOUNT_NO} {...register('account_no')} placeholder="Account number" />
              <Input
                label={TEXT_LIBRARY.COMPANY.IFSC_CODE}
                {...register('ifsc_code')}
                error={errors.ifsc_code?.message}
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
              <Input
                label={TEXT_LIBRARY.COMPANY.ACCOUNTANT_NAME}
                {...register('accountant_name')}
                placeholder="Accountant name"
              />

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  {TEXT_LIBRARY.COMPANY.DOCUMENT_FILE}
                </span>
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

              <Input
                label={TEXT_LIBRARY.COMPANY.DOCUMENT_DESC}
                {...register('document_description')}
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
              <Button
                variant="outline"
                size="sm"
                type="button"
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

          <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <Button variant="cancel" onClick={onClose} label={TEXT_LIBRARY.BUTTONS.CANCEL} />
            <Button
              variant="success"
              type="submit"
              isLoading={isSubmitting}
              label={isSubmitting ? TEXT_LIBRARY.BUTTONS.SAVING : TEXT_LIBRARY.BUTTONS.SAVE}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
