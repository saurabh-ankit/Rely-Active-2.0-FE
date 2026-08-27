import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { companyApi } from '@/api/company'

interface SetupStatusGuardProps {
  children: React.ReactNode
}

export function SetupStatusGuard({ children }: SetupStatusGuardProps) {
  const location = useLocation()
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    companyApi
      .getAll()
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
  }, [location.pathname])

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
