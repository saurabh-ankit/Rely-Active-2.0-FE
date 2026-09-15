import '@testing-library/jest-dom/vitest'

if (typeof window !== 'undefined' && !window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {} as unknown as typeof window.PointerEvent
}
