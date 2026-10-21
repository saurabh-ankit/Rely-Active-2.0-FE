import React from 'react'
import { AlertTriangle, Image as ImageIcon, Mic } from 'lucide-react'
import { INCIDENT_SEVERITY_OPTIONS, INCIDENT_TYPE_OPTIONS } from '@/lib/constants/incident'
import type { ResidentIncidentItem } from '@/lib/types/resident'
import { cn, formatDisplayDateTime, getFileUrl } from '@/lib/utils'
import { ClinicalRowActions } from './ClinicalRowActions'

interface IncidentCardProps {
  item: ResidentIncidentItem
  canUpdate: boolean
  onEdit: () => void
  onDelete: () => void
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ item, canUpdate, onEdit, onDelete }) => {
  const typeLabel = INCIDENT_TYPE_OPTIONS.find((o) => o.value === item.incidentType)?.label ?? item.incidentType
  const severity = INCIDENT_SEVERITY_OPTIONS.find((o) => o.value === item.severity)

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-3.5 shadow-sm space-y-2.5 dark:border-gray-800 dark:from-slate-900 dark:to-slate-900/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[160px] flex-1 items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">{typeLabel}</h4>
            <p className={cn('text-[11px] font-semibold', severity?.textClassName)}>
              {severity?.label ?? item.severity}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-[12px] text-gray-600 dark:text-gray-300">
        <p>
          When:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{formatDisplayDateTime(item.incidentAt)}</span>
        </p>
        {item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
        {item.reportedByName && (
          <p>
            Reported by: <span className="font-semibold">{item.reportedByName}</span>
          </p>
        )}
        {item.sop && (
          <p>
            SOP:{' '}
            <span className="font-semibold">
              {item.sop.completed}/{item.sop.total} steps
              {item.sop.isComplete ? ' (complete)' : ''}
            </span>
          </p>
        )}
      </div>

      {(item.photos.length > 0 || item.voiceNotes.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {item.photos.map((photo) => (
            <a
              key={photo.id}
              href={getFileUrl(photo.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-slate-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Photo
            </a>
          ))}
          {item.voiceNotes.map((note) => (
            <a
              key={note.id}
              href={getFileUrl(note.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-slate-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
            >
              <Mic className="h-3.5 w-3.5" />
              Voice note
            </a>
          ))}
        </div>
      )}

      {canUpdate && <ClinicalRowActions label="incident" onEdit={onEdit} onDelete={onDelete} />}
    </div>
  )
}

export default IncidentCard
