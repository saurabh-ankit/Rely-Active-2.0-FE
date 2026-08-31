import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDisplayDate(date?: string | Date | null): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export function getFileUrl(path?: string | null): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3002'
  const origin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}

export function isImageFile(path?: string | null, name?: string | null): boolean {
  if (!path && !name) return false
  const target = `${name || ''} ${path || ''}`.toLowerCase()
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico']
  if (imageExtensions.some((ext) => target.includes(ext))) {
    return true
  }
  if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
    const cleanUrl = path.split('?')[0]?.toLowerCase() || ''
    if (imageExtensions.some((ext) => cleanUrl.endsWith(ext))) {
      return true
    }
  }
  return false
}
