import { Info, Lock } from 'lucide-react'

interface AssignedPackageProps {
  name: string
  /** e.g. "₹9,000 / month · Dine-in · since 17/09/2026" */
  detail: string
  /** Where the package can be changed, e.g. "Food & Beverage → Property Packages & Pricing". */
  manageIn: string
}

/** A package already assigned to a person: shown read-only, with where to change it. */
export function AssignedPackage({ name, detail, manageIn }: AssignedPackageProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-gray-200">
          <Lock className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-xs font-bold text-gray-900">
            {name}
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Assigned
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">{detail}</p>
        </div>
      </div>
      <p className="flex items-start gap-1.5 text-[11px] text-sky-800 sm:max-w-[48%]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          To change or stop it, go to <b>{manageIn}</b>.
        </span>
      </p>
    </div>
  )
}
