/**
 * Generates a standard UUID v4 string safely across secure (HTTPS/localhost)
 * and non-secure (HTTP IP dev servers) browser contexts.
 */
export const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    try {
      return window.crypto.randomUUID()
    } catch {
      // Fallback if browser security context restricts randomUUID
    }
  }

  // RFC4122 v4 compliant fallback generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default generateUUID
