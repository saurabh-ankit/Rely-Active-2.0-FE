import CreatePropertyScreen from './CreatePropertyScreen'

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
  if (!isOpen) return null
  return <CreatePropertyScreen companyId={companyId} onBack={onClose} onSuccess={onSuccess} />
}
