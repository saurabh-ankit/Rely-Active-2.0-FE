import React, { useState } from 'react'
import { AtSign, HeartHandshake, Mail, Phone, Plus, UserRound } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Panel } from '@/components/common/DetailPanel'
import { Button } from '@/components/ui/button'
import { useDeleteResidentGuardianMutation, useResidentGuardiansQuery } from '@/hooks/react-query/resident'
import type { ResidentGuardian } from '@/lib/types/resident'
import { getFileUrl } from '@/lib/utils'
import { ClinicalRowActions } from './medical/ClinicalRowActions'
import GuardianFormModal from './GuardianFormModal'

interface ResidentGuardiansPanelProps {
  residentId: string
  canUpdateResident: boolean
}

/** Family who don't live in the flat but look after its residents from the resident app. */
export const ResidentGuardiansPanel: React.FC<ResidentGuardiansPanelProps> = ({ residentId, canUpdateResident }) => {
  const { data, isLoading } = useResidentGuardiansQuery(residentId)
  const deleteMutation = useDeleteResidentGuardianMutation(residentId)
  const [formTarget, setFormTarget] = useState<{ item: ResidentGuardian | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentGuardian | null>(null)
  const guardians = data?.guardians ?? []
  const careRecipients = data?.careRecipients ?? []

  return (
    <>
      <Panel
        icon={HeartHandshake}
        title={`Guardians${guardians.length ? ` (${guardians.length})` : ''}`}
        action={
          canUpdateResident && !isLoading && guardians.length === 0 ? (
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              className="h-8 rounded-xl text-xs"
              onClick={() => setFormTarget({ item: null })}
            >
              Add Guardian
            </Button>
          ) : null
        }
      >
        {careRecipients.length > 0 && (
          <p className="mb-3 text-xs text-gray-500">
            Guardians can act for:{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {careRecipients
                .map((p) => `${p.fullName}${p.relation !== 'Resident' ? ` (${p.relation})` : ''}`)
                .join(', ')}
            </span>
          </p>
        )}

        {isLoading ? (
          <p className="p-4 text-center text-xs text-gray-400">Loading guardians...</p>
        ) : guardians.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
            No guardians added. Add a son, daughter or relative who looks after the residents from outside.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {guardians.map((guardian) => (
              <div
                key={guardian.id}
                className="rounded-xl border border-gray-100 bg-slate-50/60 p-3.5 dark:border-gray-800 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                      {guardian.photoUrl ? (
                        <img
                          src={getFileUrl(guardian.photoUrl)}
                          alt={guardian.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        guardian.firstName[0]?.toUpperCase() || <UserRound className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {guardian.fullName}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-2 py-px text-[10px] font-semibold text-violet-700">
                          {guardian.relation}
                        </span>
                        <span
                          className={`inline-block rounded-full px-2 py-px text-[10px] font-semibold ${
                            guardian.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {guardian.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canUpdateResident && (
                    <ClinicalRowActions
                      label="guardian"
                      onEdit={() => setFormTarget({ item: guardian })}
                      onDelete={() => setDeleting(guardian)}
                    />
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <a href={`tel:${guardian.phone}`} className="hover:text-[#005390]">
                      {guardian.phone}
                    </a>
                  </p>
                  {guardian.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <a href={`mailto:${guardian.email}`} className="truncate hover:text-[#005390]">
                        {guardian.email}
                      </a>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <AtSign className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span>
                      {guardian.username}
                      <span className="text-gray-400">
                        {' '}
                        •{' '}
                        {guardian.lastLoginAt
                          ? `last signed in ${new Date(guardian.lastLoginAt).toLocaleDateString()}`
                          : 'never signed in'}
                      </span>
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {formTarget && (
        <GuardianFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          item={formTarget.item}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove guardian?"
        description={`"${deleting?.fullName ?? ''}" will no longer be able to sign in or act for this flat's residents.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

export default ResidentGuardiansPanel
