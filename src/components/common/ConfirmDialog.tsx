import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  isPending?: boolean
  onConfirm: () => void
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="gap-5 p-6 data-[size=default]:max-w-md data-[size=default]:sm:max-w-lg">
      <AlertDialogHeader className="gap-2.5 place-items-start text-left">
        <AlertDialogTitle className="text-lg font-semibold leading-snug tracking-tight">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="-mx-6 -mb-6 gap-2.5 p-5 sm:justify-end">
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive" disabled={isPending} onClick={onConfirm}>
          {isPending ? 'Please wait...' : confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export default ConfirmDialog
