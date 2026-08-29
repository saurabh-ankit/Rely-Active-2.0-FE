import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCompaniesAPI } from '@/lib/services/companyService'

interface SetupStatusGuardProps {
  children: React.ReactNode
}

export function SetupStatusGuard({ children }: SetupStatusGuardProps) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    getCompaniesAPI()
      .then((companies) => {
        if (!isMounted) return
        setNeedsSetup(companies.length === 0)
      })
      .catch((err) => {
        console.warn('SetupStatusGuard note:', err?.message || err)
        if (isMounted) setNeedsSetup(true)
      })
      .finally(() => {
        if (isMounted) setIsChecking(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (isChecking) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-blue-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm font-medium">Validating company setup status...</span>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

export default SetupStatusGuard
