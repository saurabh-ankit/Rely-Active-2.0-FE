/**
 * Global Theme Configuration for Rely Active 2.0
 * Centralized color palette, UI state colors, badge themes, and Tailwind utility maps.
 */

export const THEME_COLORS = {
  // Primary Brand Colors (Blue Theme)
  primary: {
    main: '#2563eb', // blue-600
    hover: '#1d4ed8', // blue-700
    light: '#eff6ff', // blue-50
    border: '#bfdbfe', // blue-200
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    text: 'text-blue-600',
    textHover: 'hover:text-blue-700',
    borderColor: 'border-blue-200',
    borderFocus: 'focus:border-blue-500 focus:ring-blue-100',
    ring: 'focus:ring-blue-100',
    button: 'bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs',
  },

  // Status & State Colors
  status: {
    available: {
      bg: 'bg-emerald-50/80',
      border: 'border-emerald-300',
      text: 'text-emerald-900',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    booked: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-300',
      text: 'text-amber-900',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    sold: {
      bg: 'bg-rose-50/80',
      border: 'border-rose-300',
      text: 'text-rose-900',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    onHold: {
      bg: 'bg-purple-50/80',
      border: 'border-purple-300',
      text: 'text-purple-900',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  },

  // Ground Floor / Non-Sellable Floor Special Styling
  groundFloor: {
    bg: 'bg-blue-50/60',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },

  // General Neutrals
  neutral: {
    cardBg: 'bg-white',
    cardBorder: 'border-gray-200',
    sidebarBg: 'bg-gray-50/70',
    subtext: 'text-gray-500',
    heading: 'text-gray-900',
  },
} as const

export type ThemeColors = typeof THEME_COLORS
