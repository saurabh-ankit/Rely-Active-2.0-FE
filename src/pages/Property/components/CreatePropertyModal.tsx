import CreatePropertyScreen from './CreatePropertyScreen'
import { useScrollLock } from '@/hooks/useScrollLock'
import { createPortal } from 'react-dom'

export default function CreatePropertyModal({
  isOpen,
  companyId,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  companyId: string
  onClose: () => void
  onSuccess: () => void
}) {
  useScrollLock(isOpen)
  if (!isOpen) return null
  return createPortal(
    <CreatePropertyScreen companyId={companyId} onBack={onClose} onSuccess={onSuccess} />,
    document.body,
  )
}
