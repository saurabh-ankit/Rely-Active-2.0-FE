/**
 * Global Theme Configuration for Rely Active 2.0
 * Centralized color palette, UI state colors, badge themes, button styles, and Tailwind utility maps.
 */

export const THEME_COLORS = {
  // Primary Brand Colors (Blue Theme)
  primary: {
    main: '#005390', // Light button/primary blue
    dark: '#002C7D', // Dark button/primary blue
    hover: '#004274',
    darkHover: '#001f5c',
    light: '#eff6ff',
    border: '#bfdbfe',
    bg: 'bg-[#005390]',
    bgDark: 'bg-[#002C7D]',
    bgHover: 'hover:bg-[#004274]',
    bgDarkHover: 'hover:bg-[#001f5c]',
    text: 'text-[#005390]',
    textDark: 'text-[#002C7D]',
    textHover: 'hover:text-[#004274]',
    borderColor: 'border-[#bfdbfe]',
    borderFocus: 'focus:border-[#005390] focus:ring-blue-100',
    ring: 'focus:ring-blue-100',
  },

  // Centralized Button Color Themes (Light & Dark Buttons)
  button: {
    light: {
      color: '#005390',
      hoverColor: '#004274',
      className: 'bg-[#005390] hover:bg-[#004274] text-white shadow-md shadow-[#005390]/20 active:bg-[#003d6b]',
      outlineClassName: 'border border-[#005390] text-[#005390] hover:bg-[#005390]/10 active:bg-[#005390]/20',
    },
    dark: {
      color: '#002C7D',
      hoverColor: '#001f5c',
      className: 'bg-[#002C7D] hover:bg-[#001f5c] text-white shadow-md shadow-[#002C7D]/20 active:bg-[#001747]',
      outlineClassName: 'border border-[#002C7D] text-[#002C7D] hover:bg-[#002C7D]/10 active:bg-[#002C7D]/20',
    },
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
