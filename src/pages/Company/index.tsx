import { useEffect, useState } from 'react'
import { Building2, CreditCard, Download, Edit, Hash, Mail, MapPin, Phone, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import EditCompanyModal from './components/EditCompanyModal'
import type { CompanyData } from './components/EditCompanyModal'

export default function CompanyPage() {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isMounted = true

    fetch('http://localhost:3002/api/v1/company')
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setCompany(json.data[0])
        } else if (json.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
          setCompany(json.data)
        } else {
          setCompany(null)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch company details:', err)
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

  const handleSaveCompany = async (formData: FormData) => {
    try {
      const method = company?.id ? 'PUT' : 'POST'
      const url = company?.id
        ? `http://localhost:3002/api/v1/company/${company.id}`
        : 'http://localhost:3002/api/v1/company'

      const res = await fetch(url, {
        method,
        body: formData,
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.message || 'Failed to save company')
      }

      setReloadToken((prev) => prev + 1)
    } catch (err) {
      console.error('Error saving company:', err)
      throw err
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

  return (
    <div className="space-y-6">
      {/* Title & Edit Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Company Details</h1>
          <p className="text-sm text-gray-500">View and manage organization profile & configuration</p>
        </div>
        <Button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          {company ? 'Edit Company' : 'Add Company'}
        </Button>
      </div>

      {!company ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/50 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-bold text-gray-900">No Company Registered</h3>
          <p className="mt-1 text-sm text-gray-500">Click "Add Company" above to create your organization record.</p>
          <Button onClick={() => setIsEditModalOpen(true)} className="mt-6">
            Create Company Record
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo Card */}
          {company.document_path && (
            <div className="rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                <Building2 className="h-5 w-5 text-indigo-500" />
                Company Media
              </h3>
              <div className="flex items-center justify-center rounded-2xl bg-gray-50 p-4">
                <img
                  src={
                    company.document_path.startsWith('/')
                      ? `http://localhost:3002${company.document_path}`
                      : company.document_path
                  }
                  alt="Company Document"
                  className="max-h-56 w-full object-contain rounded-xl"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Main Info Card */}
          <div
            className={`rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur-xl ${
              company.document_path ? 'lg:col-span-2' : 'lg:col-span-3'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Building2 className="h-5 w-5 text-indigo-500" />
                {company.company_name}
              </h3>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Active Organization
              </Badge>
            </div>

            <div className="mt-6 space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Hash className="h-3.5 w-3.5" /> GST Number
                  </span>
                  <p className="text-sm font-medium text-gray-800">{company.company_gst_number || 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Mail className="h-3.5 w-3.5" /> Email Address
                  </span>
                  <p className="text-sm font-medium text-gray-800">{company.email_id || 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Phone className="h-3.5 w-3.5" /> Contact Number
                  </span>
                  <p className="text-sm font-medium text-gray-800">{company.contact_number || 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Phone className="h-3.5 w-3.5" /> Alternate Contact
                  </span>
                  <p className="text-sm font-medium text-gray-800">{company.alternate_contact_number || 'N/A'}</p>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5" /> Head Office Address
                  </span>
                  <p className="text-sm font-medium text-gray-800 whitespace-pre-line">
                    {company.company_head_office_address || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Custom Fields Section */}
              {company.customFields && company.customFields.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Custom Fields</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {company.customFields.map((field, idx) => (
                      <div key={idx} className="rounded-2xl bg-gray-50 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-500">{field.fieldLabel}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {field.fieldType}
                          </Badge>
                        </div>
                        {field.fieldType === 'document' && field.fieldValue ? (
                          <a
                            href={
                              field.fieldValue.startsWith('/')
                                ? `http://localhost:3002${field.fieldValue}`
                                : field.fieldValue
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:underline"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> Download Document
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{field.fieldValue || 'N/A'}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank Details Section */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <CreditCard className="h-4 w-4 text-indigo-500" />
                  Bank Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-gray-400 block mb-0.5">Bank Name</span>
                    <span className="font-semibold text-gray-900">{company.bank_name || 'N/A'}</span>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-gray-400 block mb-0.5">Branch</span>
                    <span className="font-semibold text-gray-900">{company.branch_name || 'N/A'}</span>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-gray-400 block mb-0.5">Account No</span>
                    <span className="font-semibold text-gray-900">{company.account_no || 'N/A'}</span>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-gray-400 block mb-0.5">IFSC Code</span>
                    <span className="font-semibold text-gray-900">{company.ifsc_code || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Accountant Details Section */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <UserCheck className="h-4 w-4 text-indigo-500" />
                  Accountant Details
                </h4>
                <div className="flex flex-wrap items-center gap-6 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Accountant Name</span>
                    <span className="font-semibold text-gray-900 text-sm">{company.accountant_name || 'N/A'}</span>
                  </div>

                  {company.accountant_signature && (
                    <div>
                      <span className="text-gray-400 block mb-1">Accountant Signature</span>
                      <div className="rounded-lg bg-white p-2 border border-gray-200">
                        <img
                          src={
                            company.accountant_signature.startsWith('/')
                              ? `http://localhost:3002${company.accountant_signature}`
                              : company.accountant_signature
                          }
                          alt="Signature"
                          className="h-10 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={company}
        onSave={handleSaveCompany}
      />
    </div>
  )
}
