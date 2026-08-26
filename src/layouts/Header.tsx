import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Building2, ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const [selectedLocation, setSelectedLocation] = useState('Moonlight Apart...')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const locations = ['Moonlight Apartments', 'Main Care Center', 'Downtown Facility', 'West Wing Manor']

  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-white/40 bg-[#dce0e4]/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left Brand */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden text-gray-700"
            aria-label="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/R_Logo.svg" alt="RELY Logo" className="h-8 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-[0.25em] text-[#4b525d] leading-none">RELY</span>
              <span className="text-[9px] font-semibold tracking-[0.3em] text-[#707784] uppercase mt-0.5">ACTIVE</span>
            </div>
          </Link>
        </div>

        {/* Right Section: Location Selector, Notifications, Profile */}
        <div className="flex items-center gap-3">
          {/* Location Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="flex items-center gap-2 rounded-full border border-gray-300/80 bg-[#e4e7ea] px-3.5 py-1.5 text-xs font-semibold text-[#4a5260] shadow-sm transition-all hover:bg-[#d8dce0]"
            >
              <Building2 className="h-3.5 w-3.5 text-gray-500" />
              <span>{selectedLocation}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>

            {showLocationDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl backdrop-blur-xl z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Select Location
                </div>
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      setSelectedLocation(loc)
                      setShowLocationDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-colors ${
                      selectedLocation === loc
                        ? 'bg-[#2d4366] font-semibold text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <button
            className="relative flex size-9 items-center justify-center rounded-full bg-[#e4e7ea] text-gray-600 shadow-sm transition-all hover:bg-[#d8dce0]"
            title="Notifications"
          >
            <Bell className="h-4 w-4 text-[#4a5260]" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex size-9 items-center justify-center rounded-full border border-white bg-slate-300 overflow-hidden shadow-sm transition-transform hover:scale-105"
            >
              <User className="h-5 w-5 text-slate-700" />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl backdrop-blur-xl z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900">Admin User</p>
                  <p className="text-[10px] text-gray-500">admin@relyactive.com</p>
                </div>
                <Link
                  to="/company"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-xl"
                >
                  <Building2 className="h-4 w-4" />
                  Company Details
                </Link>
                <Link
                  to="/global-settings"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-xl"
                >
                  <Settings className="h-4 w-4" />
                  Global Settings
                </Link>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false)
                    navigate('/login')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
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
