import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { LocationSelectionModal } from './components/common/LocationSelectionModal'
import { GlobalLoadingIndicator } from './components/common/GlobalLoadingIndicator'
import SuspenseLoader from './components/shared/SuspenseLoader'
import RootRouter from './RootRouter'

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; error?: Error }> {
  state: { failed: boolean; error?: Error } = { failed: false }
  static getDerivedStateFromError(error: Error) {
    return { failed: true, error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Rely Active web error', error, info)
  }
  render() {
    return this.state.failed ? (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="text-center max-w-2xl w-full">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted-foreground">Reload the workspace to continue.</p>
          {this.state.error && (
            <div className="mt-4 p-4 text-left bg-red-50 text-red-700 text-xs font-mono rounded-lg border border-red-200 overflow-auto max-h-60">
              <div className="font-bold">{this.state.error.message}</div>
              <div className="mt-1 whitespace-pre-wrap text-[11px] opacity-80">{this.state.error.stack}</div>
            </div>
          )}
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
      <GlobalLoadingIndicator />
      <Suspense fallback={<SuspenseLoader />}>
        <RootRouter />
      </Suspense>
      <LocationSelectionModal />
    </AppErrorBoundary>
  )
}
