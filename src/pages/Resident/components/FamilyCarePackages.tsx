import { Check } from 'lucide-react'
import type { CarePackage } from '@/lib/types/medical'
import { cn } from '@/lib/utils'
import { AssignedPackage } from './AssignedPackage'
import { Label } from '@/components/ui/label'

export interface FamilyCareRow {
  /** Index in the form's familyMembers array. */
  index: number
  key: string
  name: string
  tag: string
  carePackageId: string
  startDate: string
  /** The member's package now (edit mode); kept with its own start date unless changed. */
  current: { packageId: string; startDate: string } | null
}

interface FamilyCarePackagesProps {
  packages: CarePackage[]
  rows: FamilyCareRow[]
  onPick: (index: number, packageId: string) => void
  onStartDate: (index: number, day: string) => void
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const dmy = (day: string) => (day ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}` : '')

/** Care package per family member, under the resident's own package. */
export function FamilyCarePackages({ packages, rows, onPick, onStartDate }: FamilyCarePackagesProps) {
  if (!rows.length) return null
  return (
    <div className="space-y-3 border-t border-gray-100 pt-4">
      <div>
        <p className="text-xs font-bold text-gray-800">Family members</p>
        <p className="text-[11px] text-gray-500">
          Each family member can have their own care package, with its own tasks and free sessions.
        </p>
      </div>
      {rows.map((row) => {
        const keepsCurrent = !!row.current && row.carePackageId === row.current.packageId
        return (
          <div key={row.key} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">{row.name}</span>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                {row.tag}
              </span>
            </div>
            {row.current ? (
              <AssignedPackage
                name={packages.find((p) => p.id === row.current!.packageId)?.packageName || 'Care package'}
                detail={`since ${dmy(row.current.startDate)}`}
                manageIn="Medical → Package Subscriptions"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Option
                    selected={!row.carePackageId}
                    title="No Care Package"
                    hint="Skip for now."
                    onClick={() => onPick(row.index, '')}
                  />
                  {packages.map((pkg) => (
                    <Option
                      key={pkg.id}
                      selected={row.carePackageId === pkg.id}
                      title={pkg.packageName}
                      price={`${inr(Number(pkg.packageCost))} · ${pkg.duration}`}
                      onClick={() => onPick(row.index, pkg.id)}
                    />
                  ))}
                </div>
                {row.carePackageId && (
                  <Label className="mt-3 block border-t border-gray-100 pt-3 text-xs">
                    <span className="mb-1 block font-semibold text-gray-700">
                      Package start date <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="date"
                      value={row.startDate}
                      disabled={keepsCurrent}
                      onChange={(e) => onStartDate(row.index, e.target.value)}
                      className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs focus:border-[#005390] focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    {keepsCurrent && (
                      <span className="ml-2 text-[10px] text-gray-500">
                        Current package since {dmy(row.current!.startDate)}
                      </span>
                    )}
                  </Label>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Option({
  selected,
  title,
  hint,
  price,
  onClick,
}: {
  selected: boolean
  title: string
  hint?: string
  price?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition-all hover:shadow-sm',
        selected ? 'border-[#005390] bg-blue-50/50 ring-2 ring-[#005390]/20' : 'border-gray-200 hover:border-gray-300',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold text-gray-900">{title}</span>
        {selected && (
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#005390] text-white">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      {price && <p className="mt-1 text-xs font-bold text-[#005390]">{price}</p>}
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </button>
  )
}
