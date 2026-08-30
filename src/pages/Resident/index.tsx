import React from 'react'
import { ResidentListScreen } from './components/ResidentListScreen'
import { OnboardResidentScreen } from './components/OnboardResidentScreen'
import { ResidentDetailsScreen } from './components/ResidentDetailsScreen'

interface ResidentPageProps {
  initialView?: 'list' | 'create' | 'edit' | 'view'
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

  return <ResidentListScreen />
}

export default ResidentPage
