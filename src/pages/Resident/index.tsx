import React from 'react'
import { ResidentListScreen } from './components/ResidentListScreen'
import { OnboardResidentScreen } from './components/OnboardResidentScreen'
import { ResidentDetailsScreen } from './components/ResidentDetailsScreen'
import { ResidentBillingPage } from './components/ResidentBillingPage'

interface ResidentPageProps {
  initialView?: 'list' | 'create' | 'edit' | 'view' | 'billing'
}

export const ResidentPage: React.FC<ResidentPageProps> = ({ initialView = 'list' }) => {
  if (initialView === 'create') {
    return <OnboardResidentScreen isEditMode={false} />
  }

  if (initialView === 'edit') {
    return <OnboardResidentScreen isEditMode={true} />
  }

  if (initialView === 'view') {
    return <ResidentDetailsScreen isGlobalMode={false} />
  }

  if (initialView === 'billing') {
    return <ResidentBillingPage />
  }

  return <ResidentListScreen />
}

export { ResidentBillingPage }
export default ResidentPage
