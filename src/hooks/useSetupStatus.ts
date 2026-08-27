import { useCallback, useEffect, useState } from 'react'
import { companyApi } from '@/api/company'

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
      const data = await companyApi.getSetupStatus()
      if (data) {
        setSetupStatus(data as unknown as SetupStatusData)
        return data as unknown as SetupStatusData
      } else {
        const companies = await companyApi.getAll()
        const hasCompany = companies.length > 0
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

    companyApi
      .getSetupStatus()
      .then((data) => {
        if (!isMounted) return
        if (data) {
          setSetupStatus(data as unknown as SetupStatusData)
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
