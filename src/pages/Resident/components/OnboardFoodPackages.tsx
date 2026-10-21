import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { Check, RefreshCw, Utensils } from 'lucide-react'
import api from '@/lib/api/axios'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AssignedPackage } from './AssignedPackage'
import { Label } from '@/components/ui/label'

export interface FoodPackageChoice {
  /** Packages are dine-in only. */
  propertyPackageId: string
  /** First day of the package (YYYY-MM-DD). */
  startDate: string
}

/** A package the person already has (edit mode): kept as-is unless a different one is picked. */
export interface ExistingFoodPackage {
  propertyPackageId: string
  startDate: string
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dmy = (day: string) => (day ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}` : '')

export interface FoodPackagePerson {
  /** 'PRIMARY' for the resident, otherwise a stable key for the family member row. */
  key: string
  name: string
  tag: string
}

interface PropertyFoodPackage {
  id: string
  price: number | string
  isActive?: boolean
  globalPackage?: { name?: string; dietaryType?: string; includedMealSlots?: string[] } | null
}

const DIET_STYLE: Record<string, string> = {
  veg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  non_veg: 'bg-rose-50 text-rose-700 border-rose-200',
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

interface OnboardFoodPackagesProps {
  locId: string
  people: FoodPackagePerson[]
  value: Record<string, FoodPackageChoice | undefined>
  onChange: (next: Record<string, FoodPackageChoice | undefined>) => void
  /** Current packages by person key (edit mode). */
  existing?: Record<string, ExistingFoodPackage | undefined>
}

/** Food package per person (resident and each family member), chosen while onboarding. */
export function OnboardFoodPackages({ locId, people, value, onChange, existing = {} }: OnboardFoodPackagesProps) {
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['fnb', 'property-packages', locId],
    queryFn: async () => {
      const res = await api.get(`/fnb/properties/${locId}/packages`)
      const list: PropertyFoodPackage[] = res.data?.data || []
      return list.filter((p) => p.isActive !== false)
    },
    enabled: !!locId,
  })

  const set = (key: string, choice: FoodPackageChoice | undefined) => onChange({ ...value, [key]: choice })

  if (isLoading) {
    return (
      <div className="py-6 text-center text-xs text-gray-400">
        <RefreshCw className="mx-auto mb-1 h-4 w-4 animate-spin text-[#005390]" />
        Loading food packages...
      </div>
    )
  }
  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
        No food packages set up for this property yet. Add them in Property → F&amp;B settings.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {people.map((person) => {
        const choice = value[person.key]
        const current = existing[person.key]
        // An unchanged current package keeps its original start date.
        const keepsCurrent = !!current && choice?.propertyPackageId === current.propertyPackageId
        const selected = packages.find((p) => p.id === choice?.propertyPackageId)
        return (
          <div key={person.key} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#005390]/10 text-[11px] font-bold text-[#005390]">
                  {initials(person.name)}
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-900">{person.name}</p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      person.key === 'PRIMARY' ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700',
                    )}
                  >
                    {person.tag}
                  </span>
                </div>
              </div>
              {selected && (
                <span className="text-xs text-gray-600">
                  <b className="text-[#005390]">{inr(Number(selected.price))}</b> / month · Dine-in
                </span>
              )}
            </div>

            {current ? (
              <AssignedPackage
                name={packages.find((p) => p.id === current.propertyPackageId)?.globalPackage?.name || 'Food package'}
                detail={`${selected ? `${inr(Number(selected.price))} / month · ` : ''}Dine-in · since ${dmy(current.startDate)}`}
                manageIn="Food & Beverage → Property Packages & Pricing"
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => set(person.key, undefined)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all hover:shadow-sm h-auto flex flex-col items-stretch justify-start whitespace-normal font-normal',
                      !choice
                        ? 'border-[#005390] bg-blue-50/50 ring-2 ring-[#005390]/20 hover:bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-white',
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-gray-800">No Food Package</span>
                      {!choice && <Tick />}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 w-full">Order meals à la carte.</p>
                  </Button>
                  {packages.map((pkg) => {
                    const isSelected = choice?.propertyPackageId === pkg.id
                    const diet = pkg.globalPackage?.dietaryType || ''
                    const slots = pkg.globalPackage?.includedMealSlots?.length ?? 0
                    return (
                      <Button
                        variant="ghost"
                        key={pkg.id}
                        type="button"
                        onClick={() =>
                          set(person.key, {
                            propertyPackageId: pkg.id,
                            startDate:
                              current?.propertyPackageId === pkg.id
                                ? current.startDate
                                : choice && !keepsCurrent
                                  ? choice.startDate
                                  : today(),
                          })
                        }
                        className={cn(
                          'rounded-xl border p-3 text-left transition-all hover:shadow-sm h-auto flex flex-col items-stretch justify-start whitespace-normal font-normal',
                          isSelected
                            ? 'border-[#005390] bg-blue-50/50 ring-2 ring-[#005390]/20 hover:bg-blue-50/50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-white',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="truncate text-xs font-bold text-gray-900">
                            {pkg.globalPackage?.name || 'Food package'}
                          </span>
                          {isSelected && <Tick />}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 w-full">
                          <span className="text-sm font-black text-[#005390]">{inr(Number(pkg.price))}</span>
                          <span className="text-[10px] text-gray-500">/ month</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1 w-full">
                          {diet && (
                            <span
                              className={cn(
                                'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold capitalize',
                                DIET_STYLE[diet] ?? 'border-gray-200 bg-gray-50 text-gray-600',
                              )}
                            >
                              {diet.replace('_', '-')}
                            </span>
                          )}
                          {slots > 0 && (
                            <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600">
                              {slots} meal{slots > 1 ? 's' : ''} / day
                            </span>
                          )}
                        </div>
                      </Button>
                    )
                  })}
                </div>

                {choice && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
                    <Label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-gray-600">
                        Start date <span className="text-rose-600">*</span>
                      </span>
                      <Input
                        type="date"
                        required
                        value={choice.startDate}
                        disabled={keepsCurrent}
                        onChange={(e) => set(person.key, { ...choice, startDate: e.target.value })}
                        className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs focus:border-[#005390] focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      />
                      {keepsCurrent && (
                        <span className="mt-0.5 block text-[10px] text-gray-500">
                          Current plan since {dmy(current.startDate)}
                        </span>
                      )}
                    </Label>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <Utensils className="h-3.5 w-3.5" />
        Each package is billed from its start date on the flat&apos;s monthly invoice. Once assigned, a package is
        changed from Food &amp; Beverage.
      </p>
    </div>
  )
}

const Tick = () => (
  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#005390] text-white">
    <Check className="h-3 w-3" />
  </span>
)
