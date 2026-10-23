import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TicketStoreState {
  viewedTicketIds: Record<string, string[]>
  markTicketAsViewed: (userId: string | null | undefined, ticketId: string) => void
  isTicketViewed: (userId: string | null | undefined, ticketId: string) => boolean
  getViewedTickets: (userId: string | null | undefined) => string[]
  clearViewedTickets: () => void
}

export const useTicketStore = create<TicketStoreState>()(
  persist(
    (set, get) => ({
      viewedTicketIds: {},

      markTicketAsViewed: (userId, ticketId) => {
        const key = userId || 'anon'
        const current = get().viewedTicketIds[key] || []
        if (current.includes(ticketId)) return

        const updated = [...current.slice(-499), ticketId]
        set((state) => ({
          viewedTicketIds: {
            ...state.viewedTicketIds,
            [key]: updated,
          },
        }))
      },

      isTicketViewed: (userId, ticketId) => {
        const key = userId || 'anon'
        const list = get().viewedTicketIds[key] || []
        return list.includes(ticketId)
      },

      getViewedTickets: (userId) => {
        const key = userId || 'anon'
        return get().viewedTicketIds[key] || []
      },

      clearViewedTickets: () => {
        set({ viewedTicketIds: {} })
      },
    }),
    {
      name: 'rely-active-tickets-storage',
    },
  ),
)

export default useTicketStore
