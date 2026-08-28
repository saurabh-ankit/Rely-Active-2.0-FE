import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AuthProvider } from './context/AuthContext'
import { LocationProvider } from './context/LocationContext'
import { LocationSelectionModal } from './components/common/LocationSelectionModal'
import RootRouter from './RootRouter'

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Rely Active web error', error, info)
  }
  render() {
    return this.state.failed ? (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted-foreground">Reload the workspace to continue.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </main>
    ) : (
      this.props.children
    )
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <LocationProvider>
          <RootRouter />
          <LocationSelectionModal />
        </LocationProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}
