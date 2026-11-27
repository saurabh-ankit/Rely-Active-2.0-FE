import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useLocationContext } from '@/hooks/useLocation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useNavItems } from './useNavItems'

export interface SidebarItemData {
  icon: React.ReactNode
  label: string
  href: string
  resourceKey?: string
  isActive?: boolean
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const SidebarItem: React.FC<{ item: SidebarItemData; onClick?: () => void }> = ({ item, onClick }) => {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        'group flex transition-all duration-200',
        // Mobile layout: horizontal row with icon and name
        'w-full flex-row items-center gap-3 px-2.5 py-2 rounded-xl bg-transparent hover:bg-white/10',
        // Desktop layout: stacked column
        'md:flex-col md:items-center md:gap-2 md:py-3 md:px-0 md:bg-transparent md:hover:scale-105 md:hover:bg-transparent',
      )}
    >
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl transition-all duration-200 shrink-0',
          'w-9 h-9 md:w-full md:h-12 lg:h-14',
          item.isActive ? 'text-white' : 'bg-transparent text-gray-500 hover:text-[#005390] md:hover:bg-[#005390]/10',
        )}
      >
        {/* One shared pill: layoutId makes it glide from the old active item to the new one */}
        {item.isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-xl bg-[#005390] shadow-md shadow-[#005390]/20"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          />
        )}
        <div
          className={cn(
            'relative flex items-center justify-center transition-colors',
            item.isActive ? 'text-white font-bold' : 'text-gray-500 group-hover:text-[#005390]',
          )}
        >
          {item.icon}
        </div>
      </div>
      <span
        className={cn(
          'text-xs font-semibold whitespace-nowrap transition-colors block',
          'md:text-xs md:font-medium md:text-center md:whitespace-normal md:leading-tight',
          item.isActive ? 'text-[#005390] font-bold' : 'text-gray-600 md:text-gray-500 group-hover:text-[#005390]',
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation()
  const { isLoadingLocations } = useLocationContext()

  // Same list and permission rules as the command palette (layouts/useNavItems.ts)
  const filteredItems: SidebarItemData[] = useNavItems().map(({ icon: Icon, label, href, resourceKey }) => ({
    icon: <Icon className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
    label,
    href,
    resourceKey,
  }))

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar-backdrop"
            role="button"
            tabIndex={0}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-md md:hidden cursor-pointer"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                onClose?.()
              }
            }}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed left-0 top-16 z-50 md:top-0 md:z-10 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 w-[260px] sm:w-[280px] md:w-[120px] shrink-0',
          'h-[calc(100vh-4rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-full flex flex-col p-1.5 md:p-2 lg:p-3 pr-1.5 md:pr-0 lg:pr-0">
          <div className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-2 md:p-3 overflow-hidden flex flex-col">
            {/* layoutScroll: lets the active pill measure correctly when this list is scrolled */}
            <motion.div layoutScroll className="flex flex-col h-full overflow-y-auto no-scrollbar gap-1">
              {/* Mobile drawer header */}
              <div className="md:hidden flex items-center justify-between px-1.5 pt-0.5 pb-2 shrink-0 border-b border-white/30">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={onClose}
                  aria-label="Close sidebar"
                  className="w-8 h-8 rounded-xl bg-white/40 hover:bg-white/60 text-gray-700 border border-white/40 shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isLoadingLocations ? (
                <div className="p-2 text-[10px] text-gray-400 text-center">Loading modules...</div>
              ) : (
                filteredItems.map((item, index) => (
                  <SidebarItem
                    key={index}
                    item={{
                      ...item,
                      isActive:
                        location.pathname === item.href ||
                        (item.href !== '/dashboard' && location.pathname.startsWith(item.href)),
                    }}
                    onClick={onClose}
                  />
                ))
              )}
            </motion.div>
          </div>
        </div>
      </aside>
    </>
  )
}
