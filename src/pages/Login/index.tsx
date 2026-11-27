import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { COMPANY_KEYS } from '@/hooks/react-query/company'
import { getCompaniesAPI } from '@/lib/services/companyService'
import { notifyError, notifySuccess } from '@/utils/toast'

import { getDepartmentManagerType, getDepartmentManagerDefaultRoute } from '@/utils/departmentManager'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
  const [shakeScope, animateShake] = useAnimate<HTMLDivElement>()
  const reduceMotion = useReducedMotion()

  /** Short horizontal shake of the card on a failed sign-in. */
  const shake = () => {
    if (reduceMotion || !shakeScope.current) return
    animateShake(shakeScope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.45, ease: 'easeInOut' })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedUsername || !trimmedPassword) {
      const msg = 'Please enter both username and password.'
      setErrorMsg(msg)
      notifyError('Validation Error', msg)
      shake()
      return
    }

    setIsLoading(true)
    setErrorMsg(null)
    try {
      const user = await authLogin({
        username: trimmedUsername,
        password: trimmedPassword,
      })
      notifySuccess('Sign in successful!', 'Welcome back to Rely Active Operations.')

      try {
        const companies = await queryClient.query({
          queryKey: COMPANY_KEYS.all,
          queryFn: getCompaniesAPI,
          staleTime: 30_000,
        })
        if (Array.isArray(companies) && companies.length === 0) {
          navigate('/setup')
          return
        }
      } catch (checkErr) {
        console.warn('Could not verify company setup status on login:', checkErr)
      }

      const managerType = getDepartmentManagerType(user)
      if (managerType) {
        navigate(getDepartmentManagerDefaultRoute(managerType))
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      console.warn('Login note:', message)
      setErrorMsg(message)
      notifyError('Sign In Failed', message)
      shake()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#c4c6c9] p-4 font-sans text-slate-800">
      {/* Slowly drifting soft glows behind the glass card (frozen when the OS asks for reduced motion) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 -left-32 size-[34rem] rounded-full bg-[#005390]/20 blur-3xl"
          animate={{ x: [0, 120, 40, 0], y: [0, 80, 160, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-40 -bottom-40 size-[38rem] rounded-full bg-white/50 blur-3xl"
          animate={{ x: [0, -140, -60, 0], y: [0, -90, -30, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 size-[22rem] rounded-full bg-[#71849a]/25 blur-3xl"
          animate={{ x: [0, -180, 80, 0], y: [0, 60, -70, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Card entrance; the inner ref is shaken separately on a failed sign-in */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div ref={shakeScope}>
          {/* Centered Login Glass Card */}
          <Card className="gap-0 relative w-full rounded-[32px] border border-white/60 bg-[#d7d9dc]/90 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:p-10">
            {/* Brand Header */}
            <CardHeader className="p-0 flex flex-col items-center text-center">
              <img src="/R_Logo.svg" alt="RELY Logo" className="mb-4 h-16 w-auto object-contain" />
              <CardTitle className="text-2xl font-bold tracking-[0.25em] text-[#4b525d]">R E L Y</CardTitle>
              <h2 className="mt-1 text-xs font-semibold tracking-[0.3em] text-[#707784] uppercase">A C T I V E</h2>
              <CardDescription className="mt-2 text-xs text-[#808794]">
                A one stop solution for all community needs
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <AnimatePresence initial={false}>
                {errorMsg && (
                  <motion.div
                    key="login-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-600 font-medium text-center">
                      {errorMsg}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="mt-8 space-y-4">
                {/* Username Field */}
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#5a616d]">
                    <User className="h-3.5 w-3.5" />
                    Username
                  </span>
                  <div className="relative">
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username (e.g. superadmin)"
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
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-gray-300/80 bg-[#e4e6e9] py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-500/70 focus:border-[#71849a] focus:bg-[#eaecf0] focus:outline-none focus:ring-2 focus:ring-[#71849a]/30"
                    />
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500/80" />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-500/80 hover:text-slate-800 hover:bg-transparent transition-colors p-0"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign In Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005390] hover:bg-[#004274] py-2.5 h-10 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <LogIn className="h-4 w-4" />
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
