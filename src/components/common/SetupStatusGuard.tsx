import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface SetupStatusGuardProps {
  children: React.ReactNode
}

export function SetupStatusGuard({ children }: SetupStatusGuardProps) {
  const location = useLocation()
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    fetch('http://localhost:3002/api/v1/company')
      .then((res) => {
        if (!res.ok) return { success: false, data: [] }
        return res.json()
      })
      .then((json) => {
        if (!isMounted) return
        const companies = Array.isArray(json.data)
          ? json.data
          : json.data && typeof json.data === 'object' && json.data.id
            ? [json.data]
            : []
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
        <div className="flex items-center gap-3 text-indigo-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="text-sm font-medium">Validating company setup status...</span>
        </div>
      </div>
    )
  }

  // If setup is needed, redirect to standalone /setup page (outside Header & Sidebar)
  if (needsSetup) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

export default SetupStatusGuard
