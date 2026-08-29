import React from 'react'
import { ResidentListScreen } from './components/ResidentListScreen'
import { OnboardResidentScreen } from './components/OnboardResidentScreen'

interface ResidentPageProps {
  initialView?: 'list' | 'create' | 'edit'
}

export const ResidentPage: React.FC<ResidentPageProps> = ({ initialView = 'list' }) => {
  if (initialView === 'create') {
    return <OnboardResidentScreen isEditMode={false} />
  }

  if (initialView === 'edit') {
    return <OnboardResidentScreen isEditMode={true} />
  }

  return <ResidentListScreen />
}

export default ResidentPage
