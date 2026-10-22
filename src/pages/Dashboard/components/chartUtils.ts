/** Categorical series colours, assigned in this order (validated for colour-vision deficiency). */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

/** Status colours: reserved for good / warning / serious / critical states, always shown with a label. */
export const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' }

export const GRID = '#e1e0d9'
export const AXIS_TICK = { fill: '#898781', fontSize: 11 }

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export const formatNumber = (v: number) => inr.format(Math.round(v))
export const formatINR = (v: number) => `₹${inr.format(Math.round(v))}`
/** ₹ with lakh / crore suffixes, for axes and big figures. */
export const formatINRCompact = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`
  if (a >= 1e3) return `₹${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`
  return `₹${Math.round(v)}`
}
export const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
export const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
