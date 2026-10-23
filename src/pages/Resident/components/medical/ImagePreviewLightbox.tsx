import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ImagePreviewLightboxProps {
  url: string | null
  alt?: string
  onClose: () => void
}

/** Full-screen image preview; click backdrop or X to close. */
export const ImagePreviewLightbox: React.FC<ImagePreviewLightboxProps> = ({ url, alt = 'Preview', onClose }) => {
  if (!url || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="button"
      tabIndex={0}
      aria-label="Close preview"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter') onClose()
      }}
    >
      <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white p-2 shadow-2xl dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 cursor-pointer rounded-full bg-black/70 p-2 text-white transition-colors hover:bg-black/90"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <img src={url} alt={alt} className="max-h-[82vh] w-full rounded-xl object-contain" />
      </div>
    </div>,
    document.body,
  )
}

export default ImagePreviewLightbox
