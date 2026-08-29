export interface CompanyData {
  id?: string
  company_name: string
  trade_name?: string | null
  tax_id?: string | null
  gst_number?: string | null
  company_email?: string | null
  company_phone?: string | null
  website?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  country?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_ifsc?: string | null
  accountant_signature?: string | null
  is_setup_complete?: boolean
}
