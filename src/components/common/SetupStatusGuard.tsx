import { Navigate } from 'react-router-dom'
import { useCompaniesQuery } from '@/hooks/react-query/company'

interface SetupStatusGuardProps {
  children: React.ReactNode
}

export function SetupStatusGuard({ children }: SetupStatusGuardProps) {
  const { data: companies, isLoading, isError } = useCompaniesQuery()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-blue-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm font-medium">Validating company setup status...</span>
        </div>
      </div>
    )
  }

  if (!isError && Array.isArray(companies) && companies.length === 0) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

export default SetupStatusGuard
