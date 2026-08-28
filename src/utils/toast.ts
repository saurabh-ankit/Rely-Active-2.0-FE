import { toast } from 'sonner'

export const notifySuccess = (message: string, description?: string) => {
  toast.success(message, {
    description,
    duration: 3500,
    className: 'bg-white border-emerald-200 text-emerald-950 font-semibold shadow-xl rounded-2xl',
  })
}

export const notifyError = (message: string, description?: string) => {
  toast.error(message, {
    description,
    duration: 4500,
    className: 'bg-white border-rose-200 text-rose-950 font-semibold shadow-xl rounded-2xl',
  })
}

export const notifyLoading = (message: string) => {
  return toast.loading(message, {
    className: 'bg-white border-blue-200 text-blue-950 font-semibold shadow-xl rounded-2xl',
  })
}

export const dismissToast = (toastId?: string | number) => {
  toast.dismiss(toastId)
}
