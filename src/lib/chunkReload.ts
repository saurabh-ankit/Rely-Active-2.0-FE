/**
 * After a deploy, a tab opened earlier still points at the old hashed chunk files (e.g.
 * RosterCalendar-<hash>.js), which no longer exist, so lazy pages fail to load. Reloading picks up
 * the new index.html and chunk names. The reload happens at most once per 30 seconds so a real
 * outage can't loop forever; after that the error screen is shown.
 */
const RELOAD_KEY = 'rely:chunk-reload-at'
const RELOAD_GAP_MS = 30_000

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'Unable to preload CSS',
]

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return CHUNK_ERROR_PATTERNS.some((p) => message.includes(p))
}

/** Reloads the page unless it already did so recently. Returns true when a reload was started. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_GAP_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // Storage blocked: still reload; the browser will show the error screen if it fails again.
  }
  window.location.reload()
  return true
}
