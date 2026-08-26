import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:3002/api/v1/company')
      const json = await res.json()
      const companies = Array.isArray(json.data)
        ? json.data
        : json.data && typeof json.data === 'object' && json.data.id
          ? [json.data]
          : []

      if (companies.length === 0) {
        navigate('/setup')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      console.error('Login setup check error:', err)
      // If company check fails or company is empty, redirect to setup page
      navigate('/setup')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#c4c6c9] p-4 font-sans text-slate-800">
      {/* Centered Login Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-[32px] border border-white/60 bg-[#d7d9dc]/90 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:p-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <img src="/R_Logo.svg" alt="RELY Logo" className="mb-4 h-16 w-auto object-contain" />
          <h1 className="text-2xl font-bold tracking-[0.25em] text-[#4b525d]">R E L Y</h1>
          <h2 className="mt-1 text-xs font-semibold tracking-[0.3em] text-[#707784] uppercase">A C T I V E</h2>
          <p className="mt-2 text-xs text-[#808794]">A one stop solution for all community needs</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          {/* User ID Field */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#5a616d]">
              <User className="h-3.5 w-3.5" />
              User ID
            </span>
            <div className="relative">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID"
                className="w-full rounded-xl border border-gray-300/80 bg-[#e4e6e9] py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-500/70 focus:border-[#71849a] focus:bg-[#eaecf0] focus:outline-none focus:ring-2 focus:ring-[#71849a]/30"
              />
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500/80" />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#5a616d]">
              <Lock className="h-3.5 w-3.5" />
              Password
            </span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-300/80 bg-[#e4e6e9] py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-500/70 focus:border-[#71849a] focus:bg-[#eaecf0] focus:outline-none focus:ring-2 focus:ring-[#71849a]/30"
              />
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500/80" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500/80 hover:text-slate-800 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6f8298] py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#5e7186] active:scale-[0.99] disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
