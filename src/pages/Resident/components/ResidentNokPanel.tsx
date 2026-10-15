import React, { useState } from 'react'
import { Contact, Mail, MapPin, Phone, Plus } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Panel } from '@/components/common/DetailPanel'
import { Button } from '@/components/ui/button'
import { useDeleteResidentNokContactMutation, useResidentNokContactsQuery } from '@/hooks/react-query/resident'
import type { ResidentNokContact } from '@/lib/types/resident'
import { getFileUrl } from '@/lib/utils'
import { ClinicalRowActions } from './medical/ClinicalRowActions'
import NokContactFormModal from './NokContactFormModal'

interface ResidentNokPanelProps {
  residentId: string
  canUpdateResident: boolean
}

export const ResidentNokPanel: React.FC<ResidentNokPanelProps> = ({ residentId, canUpdateResident }) => {
  const { data: contacts = [], isLoading } = useResidentNokContactsQuery(residentId)
  const deleteMutation = useDeleteResidentNokContactMutation(residentId)
  const [formTarget, setFormTarget] = useState<{ item: ResidentNokContact | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentNokContact | null>(null)

  return (
    <>
      <Panel
        icon={Contact}
        title={`Next of Kin (NOK)${contacts.length ? ` (${contacts.length})` : ''}`}
        action={
          canUpdateResident ? (
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              className="h-8 rounded-xl text-xs"
              onClick={() => setFormTarget({ item: null })}
            >
              Add NOK
            </Button>
          ) : null
        }
      >
        {isLoading ? (
          <p className="p-4 text-center text-xs text-gray-400">Loading NOK contacts...</p>
        ) : contacts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
            No NOK contacts added.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-xl border border-gray-100 bg-slate-50/60 p-3.5 dark:border-gray-800 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-sm font-bold text-[#005390]">
                      {contact.photoUrl ? (
                        <img
                          src={getFileUrl(contact.photoUrl)}
                          alt={contact.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        contact.fullName[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{contact.fullName}</p>
                      {contact.relationship && (
                        <span className="mt-0.5 inline-block rounded-full border border-sky-200 bg-sky-50 px-2 py-px text-[10px] font-semibold capitalize text-[#005390]">
                          {contact.relationship}
                        </span>
                      )}
                    </div>
                  </div>
                  {canUpdateResident && (
                    <ClinicalRowActions
                      label="NOK contact"
                      onEdit={() => setFormTarget({ item: contact })}
                      onDelete={() => setDeleting(contact)}
                    />
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <a href={`tel:${contact.phone}`} className="hover:text-[#005390]">
                      {contact.phone}
                    </a>
                    {contact.alternatePhone && (
                      <>
                        <span className="text-gray-300">/</span>
                        <a href={`tel:${contact.alternatePhone}`} className="hover:text-[#005390]">
                          {contact.alternatePhone}
                        </a>
                      </>
                    )}
                  </p>
                  {contact.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <a href={`mailto:${contact.email}`} className="truncate hover:text-[#005390]">
                        {contact.email}
                      </a>
                    </p>
                  )}
                  {contact.address && (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="whitespace-pre-wrap">{contact.address}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {formTarget && (
        <NokContactFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          item={formTarget.item}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete NOK contact?"
        description={`"${deleting?.fullName ?? ''}" will be removed from this resident's NOK contacts.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

export default ResidentNokPanel
