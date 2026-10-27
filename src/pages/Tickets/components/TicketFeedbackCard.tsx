import { Eye, Image as ImageIcon, MessageSquare, Mic, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { TicketFeedback } from '@/lib/types'
import { FEEDBACK_RATING_LABELS, FEEDBACK_RATING_STYLES, describeFeedbackAuthor } from '../ticketFeedback'

interface TicketFeedbackCardProps {
  feedback: TicketFeedback
  /** Opens the photo full size (the page's media preview). */
  onPreviewPhoto: (url: string) => void
}

/** The resident's rating, comment, photo and voice note on completed work. */
export function TicketFeedbackCard({ feedback, onPreviewPhoto }: TicketFeedbackCardProps) {
  const photoUrl = feedback.attachments?.photoUrl || null
  const audioUrl = feedback.attachments?.audioUrl || null

  return (
    <Card className="gap-0 bg-white rounded-2xl border-gray-200/80 p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold text-gray-900 tracking-wide uppercase flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#005390]" />
          Resident Feedback
        </h3>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            FEEDBACK_RATING_STYLES[feedback.rating] || FEEDBACK_RATING_STYLES.AVERAGE
          }`}
        >
          {FEEDBACK_RATING_LABELS[feedback.rating] || feedback.rating}
        </span>
      </div>

      {feedback.comment && (
        <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-line">{feedback.comment}</p>
      )}

      {audioUrl && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-[#005390]" />
            Voice Note
          </span>
          <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
              <Volume2 className="w-4 h-4" />
            </div>
            <audio controls src={audioUrl} className="w-full h-8" preload="metadata">
              <track kind="captions" />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )}

      {photoUrl && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
            Photo
          </span>
          <Button
            type="button"
            variant="ghost"
            className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-2xs aspect-video cursor-pointer bg-gray-100 p-0 text-left w-full max-w-xs h-auto block hover:bg-gray-100"
            onClick={() => onPreviewPhoto(photoUrl)}
            aria-label="View feedback photo"
          >
            <img
              src={photoUrl}
              alt="Attached with the resident's feedback"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Eye className="w-5 h-5" />
            </div>
          </Button>
        </div>
      )}

      <div className="text-[10px] font-semibold text-gray-400">
        {describeFeedbackAuthor(feedback)}
        {feedback.createdAt ? ` · ${new Date(feedback.createdAt).toLocaleString()}` : ''}
      </div>
    </Card>
  )
}
