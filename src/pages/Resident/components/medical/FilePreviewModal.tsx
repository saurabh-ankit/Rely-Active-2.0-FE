import React from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getFileUrl, isImageFile } from '@/lib/utils'

interface FilePreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string | null
  title?: string
}

const isPdfFile = (path?: string | null): boolean => {
  if (!path) return false
  const clean = path.split('?')[0]?.toLowerCase() || ''
  return clean.endsWith('.pdf') || clean.includes('.pdf')
}

/** Modal preview for lab report / receipt files (images + PDF). */
export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  open,
  onOpenChange,
  url,
  title = 'File Preview',
}) => {
  const fileUrl = url ? getFileUrl(url) : ''
  const showImage = !!fileUrl && isImageFile(url)
  const showPdf = !!fileUrl && !showImage && isPdfFile(url)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-3 sm:max-w-4xl">
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
          {!fileUrl ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-gray-500">
              <FileText className="size-8 text-gray-400" />
              No file available
            </div>
          ) : showImage ? (
            <div className="flex max-h-[70vh] items-center justify-center overflow-auto p-3">
              <img src={fileUrl} alt={title} className="max-h-[66vh] w-full object-contain" />
            </div>
          ) : showPdf ? (
            <iframe title={title} src={fileUrl} className="h-[70vh] w-full border-0 bg-white" />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="size-10 text-[#005390]" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Preview is not available for this file type.</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#005390] hover:bg-gray-50"
              >
                <ExternalLink className="size-3.5" /> Open in new tab
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FilePreviewModal
