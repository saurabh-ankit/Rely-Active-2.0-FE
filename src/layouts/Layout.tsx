import { Activity, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'

export default function Layout() {
  const token = useAuthStore((state) => state.token)
  const signOut = useAuthStore((state) => state.signOut)
  const { resolvedTheme, setTheme } = useTheme()
  if (!token) return <Navigate to="/login" replace />
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity />
            </span>
            Rely Active <Badge variant="outline">2.0</Badge>
          </NavLink>
          <nav className="hidden gap-1 md:flex">
            <Button variant="ghost" render={<NavLink to="/" />}>
              Overview
            </Button>
            <Button variant="ghost" render={<NavLink to="/components" />}>
              Components
            </Button>
          </nav>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  )
}
