import CreatePropertyScreen from './CreatePropertyScreen'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6" showCloseButton={true}>
        <DialogHeader className="sr-only">
          <DialogTitle>Create Property</DialogTitle>
          <DialogDescription>Create a new property</DialogDescription>
        </DialogHeader>
        <CreatePropertyScreen companyId={companyId} onBack={onClose} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  )
}
