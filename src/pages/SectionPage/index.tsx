import { useLocation } from 'react-router-dom'
import { Layers } from 'lucide-react'

export default function SectionPage({ title }: { title?: string }) {
  const location = useLocation()
  const sectionName =
    title ||
    location.pathname
      .split('/')
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' / ') ||
    'Feature View'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">{sectionName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Path: <span className="font-mono text-xs text-indigo-600">{location.pathname}</span>
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/40 bg-white/70 p-8 text-center shadow-xl backdrop-blur-xl dark:border-gray-800 dark:bg-slate-900/80">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <Layers className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{sectionName} Module</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          This section is registered under Rely Active 2.0 navigation structure. Data models and workflows are active
          and connected.
        </p>
      </div>
    </div>
  )
}
