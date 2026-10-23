import React from 'react'
import { CalendarDays, FileText, Mic, Paperclip, Stethoscope } from 'lucide-react'
import type { DoctorNoteFile, ResidentDoctorNote } from '@/lib/types/resident'
import { cn, formatDisplayDate, formatDisplayDateTime, getFileUrl } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { ClinicalCard, ClinicalEmptyState, ClinicalLoadingState } from './ClinicalShared'
import { CONDITION_STYLES } from './clinicalConstants'

const AttachmentTile: React.FC<{ file: DoctorNoteFile }> = ({ file }) => {
  const url = getFileUrl(file.url)
  if (file.fileType === 'IMAGE') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={file.name}
        className="block h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-slate-50 hover:ring-2 hover:ring-[#005390]/40 dark:border-gray-700"
      >
        <img src={url} alt={file.name} className="h-full w-full object-cover" />
      </a>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-[14rem] items-center gap-2 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-gray-700 hover:border-[#005390] hover:text-[#005390] dark:border-gray-700 dark:bg-slate-800 dark:text-gray-300"
    >
      <FileText className="size-4 shrink-0 text-rose-500" />
      <span className="truncate">{file.name}</span>
    </a>
  )
}

const DoctorNoteCard: React.FC<{ note: ResidentDoctorNote }> = ({ note }) => (
  <Card className="gap-0 rounded-2xl border-gray-200 bg-white p-5 shadow-xs space-y-4 dark:border-gray-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-[#005390] dark:bg-sky-950/40">
          <Stethoscope className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{note.doctorName || 'Doctor'}</p>
          <p className="flex items-center gap-1 text-[11px] text-gray-500">
            <CalendarDays className="size-3.5" />
            {note.appointmentDate ? formatDisplayDate(note.appointmentDate) : formatDisplayDateTime(note.completedAt)}
          </p>
        </div>
      </div>
      {note.condition && (
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
            CONDITION_STYLES[note.condition],
          )}
        >
          {note.condition.toLowerCase()}
        </span>
      )}
    </div>

    {note.note && (
      <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-gray-700 dark:bg-slate-800/60 dark:text-gray-300">
        {note.note}
      </p>
    )}

    {note.attachments.length > 0 && (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <Paperclip className="size-3.5" /> Attachments ({note.attachments.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {note.attachments.map((file) => (
            <AttachmentTile key={file.id} file={file} />
          ))}
        </div>
      </div>
    )}

    {note.voiceNotes.length > 0 && (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <Mic className="size-3.5" /> Voice Notes ({note.voiceNotes.length})
        </p>
        <div className="flex flex-col gap-2">
          {note.voiceNotes.map((file) => (
            <audio key={file.id} controls preload="none" src={getFileUrl(file.url)} className="h-10 w-full max-w-md">
              <track kind="captions" />
            </audio>
          ))}
        </div>
      </div>
    )}
  </Card>
)

interface DoctorSuggestionsTabProps {
  doctorNotes: ResidentDoctorNote[]
  isLoading: boolean
}

export const DoctorSuggestionsTab: React.FC<DoctorSuggestionsTabProps> = ({ doctorNotes, isLoading }) => (
  <ClinicalCard
    icon={Stethoscope}
    iconClassName="text-[#005390]"
    title="Doctor Notes"
    count={isLoading ? undefined : doctorNotes.length}
  >
    {isLoading ? (
      <ClinicalLoadingState label="Loading doctor notes..." />
    ) : doctorNotes.length === 0 ? (
      <ClinicalEmptyState
        icon={Stethoscope}
        title="No doctor notes"
        description="Notes, files and voice notes from completed doctor visits appear here."
      />
    ) : (
      <div className="space-y-4">
        {doctorNotes.map((note) => (
          <DoctorNoteCard key={note.id} note={note} />
        ))}
      </div>
    )}
  </ClinicalCard>
)

export default DoctorSuggestionsTab
