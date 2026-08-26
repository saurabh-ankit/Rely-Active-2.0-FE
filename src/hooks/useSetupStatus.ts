import { useCallback, useEffect, useState } from 'react'

export interface SetupStatusData {
  needsSetup: boolean
  setupStep: number
  message: string
  hasCompany: boolean
  hasLocation?: boolean
}

export function useSetupStatus() {
  const [setupStatus, setSetupStatus] = useState<SetupStatusData | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  const checkSetupStatus = useCallback(async () => {
    setIsChecking(true)
    try {
      const res = await fetch('http://localhost:3002/api/v1/company/company-setup/status')
      const json = await res.json()
      if (json.success && json.data) {
        setSetupStatus(json.data)
        return json.data as SetupStatusData
      } else {
        // Fallback: fetch company directly
        const compRes = await fetch('http://localhost:3002/api/v1/company')
        const compJson = await compRes.json()
        const hasCompany = Boolean(
          compJson.data && (Array.isArray(compJson.data) ? compJson.data.length > 0 : compJson.data.id),
        )
        const statusData: SetupStatusData = {
          needsSetup: !hasCompany,
          setupStep: hasCompany ? 0 : 1,
          message: hasCompany ? 'Setup complete' : 'Please create a company',
          hasCompany,
        }
        setSetupStatus(statusData)
        return statusData
      }
    } catch (err) {
      console.error('Failed to check setup status:', err)
      const fallbackData: SetupStatusData = {
        needsSetup: false,
        setupStep: 0,
        message: 'Unable to check setup status',
        hasCompany: true,
      }
      setSetupStatus(fallbackData)
      return fallbackData
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    fetch('http://localhost:3002/api/v1/company/company-setup/status')
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return
        if (json.success && json.data) {
          setSetupStatus(json.data)
        }
      })
      .catch((err) => {
        console.error('Error fetching setup status:', err)
      })
      .finally(() => {
        if (isMounted) {
          setIsChecking(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return {
    setupStatus,
    needsSetup: setupStatus?.needsSetup ?? false,
    isChecking,
    checkSetupStatus,
  }
}
