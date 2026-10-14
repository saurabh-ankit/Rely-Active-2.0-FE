import React from 'react'
import { differenceInYears, format, isValid, parseISO } from 'date-fns'
import { CreditCard, Home, KeyRound, Mail, Phone, ShieldAlert, User, Users, Utensils } from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { InfoList, Panel } from '@/components/common/DetailPanel'
import { cn, getFileUrl } from '@/lib/utils'
import { unitLocationLabel } from '@/utils/unitLabel'

export interface FnbSubscriptionItem {
  id: string
  residentId: string
  familyMemberId?: string | null
  propertyPackageId: string
  startDate: string
  endDate?: string | null
  dietaryPreference?: string
  allergiesNotes?: string
  diningType?: string
  deliveryCharge?: number | string
  totalPrice?: number | string
  status: string
  propertyPackage?: {
    id: string
    price: number
    globalPackage?: {
      name: string
      code: string
      dietaryType: string
      includedMealSlots: string[]
    }
  }
  familyMember?: {
    id: string
    firstName: string
    lastName?: string
    relation?: string
  }
}

export interface ResidentPersonalDetailsTabProps {
  resident: ResidentItem
  fnbSubscriptions: FnbSubscriptionItem[]
  getSlotDisplayName: (slot: string) => string
  canUpdateResident: boolean
  onAssignFoodPackage: () => void
}

const parseDate = (value?: string | null) => {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? date : null
}

/** "11 Nov 1960 (65 yrs)" */
const formatDob = (value?: string | null) => {
  const date = parseDate(value)
  return date ? `${format(date, 'dd MMM yyyy')} (${differenceInYears(new Date(), date)} yrs)` : null
}

const formatDate = (value?: string | null) => {
  const date = parseDate(value)
  return date ? format(date, 'dd MMM yyyy') : null
}

/** "OWNER_OCCUPIED" -> "Owner occupied" */
const humanize = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ') : null

const DIET_STYLES: Record<string, string> = {
  veg: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  non_veg: 'border-rose-200 bg-rose-50 text-rose-700',
  egg: 'border-amber-200 bg-amber-50 text-amber-700',
}

/** One food plan in a single readable block: name, diet, meals and price. */
const FoodPlan = ({
  sub,
  getSlotDisplayName,
  compact = false,
}: {
  sub: FnbSubscriptionItem
  getSlotDisplayName: (slot: string) => string
  compact?: boolean
}) => {
  const pkg = sub.propertyPackage
  const gPkg = pkg?.globalPackage
  const diet = (gPkg?.dietaryType || 'veg').toLowerCase()
  const isDelivery = sub.diningType === 'home_delivery'
  const basePrice = Number(pkg?.price) || 0
  const deliveryFee = Number(sub.deliveryCharge) || 0
  const total = sub.totalPrice != null ? Number(sub.totalPrice) : basePrice + (isDelivery ? deliveryFee : 0)
  const meals = (gPkg?.includedMealSlots || []).map(getSlotDisplayName)

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', !compact && 'gap-3')}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('font-semibold text-gray-900', compact ? 'text-xs' : 'text-sm')}>
            {gPkg?.name || 'Food package'}
          </span>
          <span
            className={cn(
              'rounded-full border px-2 py-px text-[10px] font-semibold capitalize',
              DIET_STYLES[diet] ?? DIET_STYLES.veg,
            )}
          >
            {diet.replace('_', ' ')}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-px text-[10px] font-semibold text-gray-600">
            {isDelivery ? 'Home delivery' : 'Dine-in'}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {meals.length > 0 ? meals.join(' · ') : 'No meals listed'}
          {sub.startDate && ` · since ${formatDate(sub.startDate) ?? sub.startDate}`}
        </p>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className={cn('font-bold text-[#005390]', compact ? 'text-sm' : 'text-base')}>
          ₹{total.toLocaleString('en-IN')}
          <span className="text-xs font-medium text-gray-500">/month</span>
        </p>
        {isDelivery && deliveryFee > 0 && (
          <p className="text-[10px] text-gray-400">incl. ₹{deliveryFee.toLocaleString('en-IN')} delivery</p>
        )}
      </div>
    </div>
  )
}

export const ResidentPersonalDetailsTab: React.FC<ResidentPersonalDetailsTabProps> = ({
  resident,
  fnbSubscriptions,
  getSlotDisplayName,
  canUpdateResident,
  onAssignFoodPackage,
}) => {
  const unit = resident.unit
  const propertyName = resident.property?.property_name || resident.property?.name || null
  const familyMembers = resident.familyMembers || []
  const primarySub = fnbSubscriptions.find((s) => !s.familyMemberId && (!s.familyMember || !s.familyMember.id))
  const isTenant = resident.residentType === 'TENANT'

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Panel icon={Home} title="Home">
          <InfoList
            rows={[
              ['Property', propertyName],
              ['Flat', unit?.unit_number ? unitLocationLabel(unit) : null],
              ['Layout', unit?.unit_type || null],
              ['Flat occupancy', humanize(unit?.occupancyStatus)],
              ['Moved in', formatDate(resident.moveInDate)],
            ]}
          />
        </Panel>

        {resident.isResiding && (
          <Panel
            icon={Utensils}
            title="Food plan"
            action={
              canUpdateResident ? (
                <Button variant="secondary" className="h-8 rounded-xl text-xs" onClick={onAssignFoodPackage}>
                  {primarySub ? 'Change plan' : 'Assign plan'}
                </Button>
              ) : null
            }
          >
            {primarySub?.propertyPackage ? (
              <FoodPlan sub={primarySub} getSlotDisplayName={getSlotDisplayName} />
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                No food plan assigned yet.
              </p>
            )}
          </Panel>
        )}

        <Panel icon={Users} title={`Family members${familyMembers.length ? ` (${familyMembers.length})` : ''}`}>
          {familyMembers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
              No family members added.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {familyMembers.map((fm) => {
                const fmName = `${fm.firstName} ${fm.lastName || ''}`.trim()
                const livesHere = fm.isResiding !== false && (resident.isResiding || fm.isResiding)
                const fmSub = fnbSubscriptions.find((s) => s.familyMemberId === fm.id || s.familyMember?.id === fm.id)
                const details = [fm.gender, formatDob(fm.dob), fm.bloodGroup].filter(Boolean).join(' · ')
                return (
                  <li key={fm.id || fm.firstName} className="space-y-2 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                          {fm.photoUrl ? (
                            <img src={getFileUrl(fm.photoUrl)} alt={fmName} className="h-full w-full object-cover" />
                          ) : (
                            fm.firstName[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                            {fmName}
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-px text-[10px] font-semibold capitalize text-violet-700">
                              {fm.relation || 'Family'}
                            </span>
                          </p>
                          {details && <p className="truncate text-xs text-gray-500">{details}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs sm:justify-end">
                        {fm.phone && (
                          <a href={`tel:${fm.phone}`} className="text-gray-600 hover:text-[#005390]">
                            {fm.phone}
                          </a>
                        )}
                        <span
                          className={cn(
                            'rounded-full border px-2 py-px text-[10px] font-semibold',
                            livesHere
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700',
                          )}
                        >
                          {livesHere ? 'Residing' : 'Off-site Resident'}
                        </span>
                      </div>
                    </div>
                    {fmSub?.propertyPackage && (
                      <div className="ml-12 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                        <FoodPlan sub={fmSub} getSlotDisplayName={getSlotDisplayName} compact />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel icon={Phone} title="Contact">
          <InfoList
            rows={[
              [
                'Phone',
                resident.phone ? (
                  <a href={`tel:${resident.phone}`} className="hover:text-[#005390]">
                    {resident.phone}
                  </a>
                ) : null,
              ],
              [
                'Email',
                resident.email ? (
                  <a href={`mailto:${resident.email}`} className="flex items-center gap-1.5 hover:text-[#005390]">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{resident.email}</span>
                  </a>
                ) : null,
              ],
              [
                'Emergency',
                resident.emergencyContact ? (
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {resident.emergencyContact}
                  </span>
                ) : null,
              ],
            ]}
          />
        </Panel>

        <Panel icon={User} title="Personal">
          <InfoList
            rows={[
              ['Gender', resident.gender ? <span className="capitalize">{resident.gender.toLowerCase()}</span> : null],
              ['Date of birth', formatDob(resident.dob)],
              ['Blood group', resident.bloodGroup || null],
            ]}
          />
        </Panel>

        {isTenant && (
          <Panel icon={CreditCard} title="Rent">
            <InfoList
              rows={[
                [
                  'Monthly rent',
                  resident.rentAmount != null ? `₹${Number(resident.rentAmount).toLocaleString('en-IN')}` : null,
                ],
                ['Paid to', resident.payRentToCompany ? 'Company (added to monthly bill)' : 'Owner directly'],
              ]}
            />
          </Panel>
        )}

        <Panel icon={KeyRound} title="App login">
          <InfoList
            rows={[
              [
                'Username',
                resident.username ? (
                  <span className="font-mono text-xs">{resident.username}</span>
                ) : (
                  <span className="font-normal text-gray-400">No app access</span>
                ),
              ],
            ]}
          />
        </Panel>
      </div>
    </div>
  )
}

export default ResidentPersonalDetailsTab
