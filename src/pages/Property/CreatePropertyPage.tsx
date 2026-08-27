import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { companyApi } from '@/api/company'
import CreatePropertyScreen from './components/CreatePropertyScreen'

const COMPANY_ID_PLACEHOLDER = '00000000-0000-0000-0000-000000000001'

export default function CreatePropertyPage() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const editId = params.id || searchParams.get('editId')

  const [companyId, setCompanyId] = useState<string>(COMPANY_ID_PLACEHOLDER)

  useEffect(() => {
    companyApi
      .getAll()
      .then((companies) => {
        const first = companies[0]
        if (first?.id) setCompanyId(first.id)
      })
      .catch(() => {})
  }, [])

  return (
    <CreatePropertyScreen
      companyId={companyId}
      editPropertyId={editId}
      onBack={() => navigate('/property')}
      onSuccess={() => navigate('/property')}
    />
  )
}
