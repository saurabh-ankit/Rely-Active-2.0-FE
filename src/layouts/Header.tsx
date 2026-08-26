import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Building2, ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton = true }) => {
  const navigate = useNavigate()
  const [selectedLocation, setSelectedLocation] = useState('Moonlight Apartments')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const locations = ['Moonlight Apartments', 'Main Care Center', 'Downtown Facility', 'West Wing Manor']

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
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg rounded-full px-4 py-1.5 text-xs font-semibold text-gray-800 transition-all hover:bg-white/30"
            >
              <Building2 className="h-3.5 w-3.5 text-gray-700" />
              <span>{selectedLocation}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500 opacity-80" />
            </button>

            {showLocationDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/40 bg-white/90 p-2 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Select Property
                </div>
                {locations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc)
                      setShowLocationDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-colors ${
                      selectedLocation === loc
                        ? 'bg-slate-800 font-semibold text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bell Icon */}
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg text-gray-700 transition-transform hover:scale-105"
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
              <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-indigo-700 font-bold text-sm">
                <User className="h-5 w-5 text-gray-700" />
              </div>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/40 bg-white/95 p-2 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <p className="text-xs font-bold text-gray-900">Admin User</p>
                  <p className="text-[10px] text-gray-500">admin@relyactive.com</p>
                </div>
                <Link
                  to="/global-settings"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-xl font-medium"
                >
                  <Settings className="h-4 w-4" />
                  Global Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileDropdown(false)
                    navigate('/login')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-medium mt-1 border-t border-gray-100"
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
