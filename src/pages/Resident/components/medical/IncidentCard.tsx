import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { INCIDENT_SEVERITY_OPTIONS, INCIDENT_TYPE_OPTIONS } from '@/lib/constants/incident'
import type { ResidentIncidentItem } from '@/lib/types/resident'
import { cn, formatDisplayDateTime, getFileUrl } from '@/lib/utils'
import { ClinicalRowActions } from './ClinicalRowActions'
import { ImagePreviewLightbox } from './ImagePreviewLightbox'
import { IncidentSopBar } from './IncidentSopBar'

interface IncidentCardProps {
  item: ResidentIncidentItem
  canUpdate: boolean
  onEdit: () => void
  onDelete: () => void
  onOpenSop?: () => void
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ item, canUpdate, onEdit, onDelete, onOpenSop }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
      </div>

      {item.sop && onOpenSop && <IncidentSopBar sop={item.sop} onClick={onOpenSop} />}

      {(item.photos.length > 0 || item.voiceNotes.length > 0) && (
        <div className="space-y-2">
          {item.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.photos.map((photo) => {
                const url = getFileUrl(photo.url)
                return (
                  <button
                    key={photo.id}
                    type="button"
                    title={photo.name || 'View photo'}
                    onClick={() => setPreviewUrl(url)}
                    className="h-16 w-16 cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-slate-50 transition hover:ring-2 hover:ring-[#005390]/40 dark:border-gray-700"
                  >
                    <img src={url} alt={photo.name || 'Incident photo'} className="h-full w-full object-cover" />
                  </button>
                )
              })}
            </div>
          )}
          {item.voiceNotes.map((note) => (
            <audio key={note.id} controls preload="none" src={getFileUrl(note.url)} className="h-9 w-full max-w-md">
              <track kind="captions" />
            </audio>
          ))}
        </div>
      )}

      {canUpdate && <ClinicalRowActions label="incident" onEdit={onEdit} onDelete={onDelete} />}

      <ImagePreviewLightbox url={previewUrl} alt="Incident photo" onClose={() => setPreviewUrl(null)} />
    </div>
  )
}

export default IncidentCard
