import type { TicketFeedback } from '@/lib/types'

export const FEEDBACK_RATING_STYLES: Record<string, string> = {
  GOOD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AVERAGE: 'bg-amber-50 text-amber-700 border-amber-200',
  POOR: 'bg-rose-50 text-rose-700 border-rose-200',
}

export const FEEDBACK_RATING_LABELS: Record<string, string> = {
  GOOD: 'Good',
  AVERAGE: 'Average',
  POOR: 'Poor',
}

/** "Gopi (Son)" when a family member left it, otherwise the resident's name. */
export const describeFeedbackAuthor = (feedback: TicketFeedback): string => {
  const member = feedback.familyMember
  if (member) {
    const name = `${member.firstName || ''} ${member.lastName || ''}`.trim()
    return member.relation ? `${name} (${member.relation})` : name
  }

  const resident = feedback.resident
  if (resident) return `${resident.firstName || ''} ${resident.lastName || ''}`.trim()
  return 'Resident'
}
