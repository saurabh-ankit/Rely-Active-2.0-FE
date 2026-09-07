import { useEffect } from 'react'

let openModalCount = 0

/**
 * Custom hook to lock page scrolling when a modal, drawer, or dialog is open.
 * Locks document.body, document.documentElement, and main scroll containers.
 * Handles multiple open modals cleanly using a global modal count reference.
 */
export function useScrollLock(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return

    openModalCount += 1
    if (openModalCount === 1) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      const scrollContainers = document.querySelectorAll('main, [data-scroll-container]')
      scrollContainers.forEach((el) => {
        const htmlEl = el as HTMLElement
        htmlEl.setAttribute('data-prev-overflow', htmlEl.style.overflow || '')
        htmlEl.style.overflow = 'hidden'
      })
    }

    return () => {
      openModalCount = Math.max(0, openModalCount - 1)
      if (openModalCount === 0) {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''

        const scrollContainers = document.querySelectorAll('main, [data-scroll-container]')
        scrollContainers.forEach((el) => {
          const htmlEl = el as HTMLElement
          const prev = htmlEl.getAttribute('data-prev-overflow')
          htmlEl.style.overflow = prev || ''
          htmlEl.removeAttribute('data-prev-overflow')
        })
      }
    }
  }, [isOpen])
}
