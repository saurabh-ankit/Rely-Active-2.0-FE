import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useCompaniesQuery } from '@/hooks/react-query/company'

interface SetupStatusGuardProps {
  children: React.ReactNode
}

export function SetupStatusGuard({ children }: SetupStatusGuardProps) {
  const { data: companies, isLoading, isError } = useCompaniesQuery()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
