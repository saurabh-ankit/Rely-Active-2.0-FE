import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Building2, ChevronDown, LogOut, Menu, Settings, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useLocationContext, type PropertyLocationItem } from '@/context/LocationContext'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton = true }) => {
  const navigate = useNavigate()
  const { user, isSuperAdmin, logout } = useAuth()
  const { selectedLocationName, accessibleLocations, selectLocation } = useLocationContext()

  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const fullName = user?.profile?.first_name
    ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
    : user?.email || 'Admin User'

  const userInitial = fullName.charAt(0).toUpperCase()
  const roleTitle = isSuperAdmin ? 'Super Admin' : user?.roles?.includes('ADMIN') ? 'Property Admin' : 'Admin'

  const handleLogout = () => {
    setShowProfileDropdown(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-lg">
      <div className="flex h-16 w-full items-center justify-between px-3 md:px-6">
        {/* Left side - Logo */}
        <div className="flex items-center gap-1 md:gap-3">
          {showMenuButton && (
            <Button variant="ghost" size="icon" className="md:hidden -ml-1" onClick={onMenuClick}>
              <Menu className="h-5 w-5 text-gray-700" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}

          <Link to="/dashboard" className="flex items-center gap-2 md:gap-3">
            <img src="/R_Logo.svg" alt="Rely Logo" className="h-10 md:h-12 flex-shrink-0 object-contain" />
            <div className="flex flex-col items-start justify-center hidden md:flex gap-0.5">
              <span className="text-lg md:text-xl font-semibold text-gray-900 tracking-wide leading-none">R E L Y</span>
              <span className="text-xs md:text-sm font-medium text-gray-600 uppercase tracking-[0.2em] leading-none">
                Active
              </span>
            </div>
          </Link>
        </div>

        {/* Right side - Location + Notifications + User Avatar */}
        <div className="flex items-center gap-1.5 md:gap-4">
          {/* Location Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 transition-all hover:bg-white/30 cursor-pointer"
            >
              <Building2 className="h-3.5 w-3.5 text-[#005390]" />
              <span>{selectedLocationName || 'Select Property'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500 opacity-80" />
            </button>

            {showLocationDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/40 bg-white/95 p-2 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Accessible Properties</span>
                  {isSuperAdmin && <span className="text-[9px] text-[#005390] font-extrabold">GLOBAL</span>}
                </div>

                {accessibleLocations.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">No properties available</div>
                ) : (
                  accessibleLocations.map((p: PropertyLocationItem) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        selectLocation(p)
                        setShowLocationDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                        selectedLocationName === p.property_name
                          ? 'bg-[#005390] font-semibold text-white shadow-sm'
                          : 'hover:bg-[#005390]/10 hover:text-[#005390] text-gray-700'
                      }`}
                    >
                      <span className="truncate">{p.property_name}</span>
                      {selectedLocationName === p.property_name && <span className="text-[10px]">✓</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Bell Icon */}
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg text-gray-700 transition-transform hover:scale-105 cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-700" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* User Avatar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="relative h-10 w-10 rounded-full p-0 cursor-pointer overflow-hidden shadow-lg ring-4 ring-white/80 transition-transform hover:scale-105"
            >
              <div className="flex h-full w-full items-center justify-center bg-[#005390] text-white font-bold text-sm shadow-[#005390]/20">
                {userInitial}
              </div>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/40 bg-white/95 p-2 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <p className="text-xs font-bold text-gray-900 line-clamp-1">{fullName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#005390] bg-[#005390]/10 px-2 py-0.5 rounded-full border border-[#005390]/20">
                      <Shield className="w-3 h-3" />
                      {roleTitle}
                    </span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <Link
                    to="/global-settings"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-xl font-medium"
                  >
                    <Settings className="h-4 w-4" />
                    Global Settings
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-medium mt-1 border-t border-gray-100 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
