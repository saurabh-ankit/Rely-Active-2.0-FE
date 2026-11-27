import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { MotionConfig } from 'framer-motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import App from './App'
import { isChunkLoadError, reloadForNewVersion } from '@/lib/chunkReload'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })
// Vite fires this when a lazy chunk (or its CSS) from an older deploy can't be loaded.
window.addEventListener('vite:preloadError', (e) => {
  if (reloadForNewVersion()) e.preventDefault()
})
window.addEventListener('unhandledrejection', (e) => {
  if (isChunkLoadError(e.reason)) reloadForNewVersion()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user": framer animations collapse to instant when the OS asks for reduced motion */}
    <MotionConfig reducedMotion="user">
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>,
)
