import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Building2, Check, ChevronRight, Save, ShieldCheck, X } from 'lucide-react'
import { useResourcesQuery, useSaveUserLocationPermissionsMutation } from '@/hooks/react-query/rbac'
import { usePropertiesQuery } from '@/hooks/react-query/property'
import { useUserByIdQuery, useUsersQuery } from '@/hooks/react-query/user'
import { getUserLocationPermissionsAPI } from '@/lib/services/rbacService'
import type { UserItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { notifyError, notifySuccess } from '@/utils/toast'

type PermissionAction = 'view' | 'create' | 'update' | 'delete'

interface RoleModuleManagementProps {
  initialUser?: UserItem | null
  onClose?: () => void
}

const ACTIONS: PermissionAction[] = ['view', 'create', 'update', 'delete']

/**
 * An access level is how far along view → create → update → delete a user goes;
 * each level includes everything before it (the rule the backend also applies).
 */
const LEVELS = [
  { level: 0, label: 'No access', hint: 'Hidden from this user', tone: 'bg-gray-500 text-white', dot: 'bg-gray-300' },
  { level: 1, label: 'View', hint: 'Can open and see records', tone: 'bg-sky-600 text-white', dot: 'bg-sky-500' },
  {
    level: 2,
    label: 'View + Add',
    hint: 'Can also create new records',
    tone: 'bg-indigo-600 text-white',
    dot: 'bg-indigo-500',
  },
  {
    level: 3,
    label: 'View + Add + Edit',
    hint: 'Can also change existing records',
    tone: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  {
    level: 4,
    label: 'Full access',
    hint: 'Can also delete records',
    tone: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-500',
  },
] as const

const SHORT_LABELS = ['None', 'View', '+ Add', '+ Edit', 'Full']

/** Five-step selector: No access · View · + Add · + Edit · Full. */
const LevelSelector = ({
  value,
  onChange,
  label,
  compact = false,
}: {
  value: number
  onChange: (level: number) => void
  label: string
  compact?: boolean
}) => (
  <div
    role="radiogroup"
    aria-label={`${label} access level`}
    className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
  >
    {LEVELS.map((l) => {
      const active = value === l.level
      return (
        <button
          key={l.level}
          type="button"
          role="radio"
          aria-checked={active}
          title={`${l.label}: ${l.hint}`}
          onClick={() => onChange(l.level)}
          className={`cursor-pointer whitespace-nowrap rounded-md font-semibold transition-colors ${
            compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'
          } ${active ? `${l.tone} shadow-sm` : 'text-gray-500 hover:bg-white hover:text-gray-800'}`}
        >
          {SHORT_LABELS[l.level]}
        </button>
      )
    })}
  </div>
)

export const RoleModuleManagement: React.FC<RoleModuleManagementProps> = ({ initialUser, onClose }) => {
  const { userId: targetParamUserId } = useParams<{ userId?: string }>()
  const targetUserId = initialUser?.id || targetParamUserId

  const { data: uData = [] } = useUsersQuery(undefined, null)
  const { data: fetchedUser } = useUserByIdQuery(targetUserId)
  const { data: rData = [] } = useResourcesQuery()
  const { data: pData = [] } = usePropertiesQuery()
  const saveLocationPermissionsMutation = useSaveUserLocationPermissionsMutation()

  // Modules (in API order) with their sub-modules.
  const modules = React.useMemo(() => rData.filter((r) => !r.parentKey), [rData])
  const childrenOf = React.useMemo(() => {
    const map = new Map<string, typeof rData>()
    for (const r of rData) {
      if (!r.parentKey) continue
      map.set(r.parentKey, [...(map.get(r.parentKey) || []), r])
    }
    return map
  }, [rData])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(initialUser || null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [activePermissions, setActivePermissions] = useState<Set<string>>(new Set())
  // What is stored on the server for this user and property; Save is enabled only when they differ.
  const [savedPermissions, setSavedPermissions] = useState<Set<string>>(new Set())
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    let nextUser: UserItem | null = null
    if (initialUser) {
      nextUser = initialUser
    } else if (fetchedUser) {
      nextUser = fetchedUser
    } else if (targetParamUserId) {
      const found = uData.find((u) => u.id === targetParamUserId)
      if (found) nextUser = found
    } else if (uData.length > 0 && !selectedUser) {
      nextUser = uData[0]
    }

    if (nextUser && nextUser.id !== selectedUser?.id) {
      const timer = setTimeout(() => setSelectedUser(nextUser), 0)
      return () => clearTimeout(timer)
    }
  }, [initialUser, fetchedUser, targetParamUserId, uData, selectedUser])

  const userAssignedProperties = React.useMemo(() => {
    if (!selectedUser) return []

    const propMap = new Map<string, { id: string; property_name: string }>()

    // 1. Check assignedProperties
    if (Array.isArray(selectedUser.assignedProperties)) {
      selectedUser.assignedProperties.forEach((p: Record<string, unknown>) => {
        const id = (p.id || p.propertyId || p.property_id || p.locId) as string
        const name = (p.property_name || p.name || pData.find((item) => item.id === id)?.property_name) as string
        if (id && name) {
          propMap.set(id, { id, property_name: name })
        }
      })
    }

    // 2. Check userLocations
    if (Array.isArray(selectedUser.userLocations)) {
      selectedUser.userLocations.forEach((ul: Record<string, unknown>) => {
        const ulProp = ul.property as { id?: string; property_name?: string } | undefined
        const ulLoc = ul.location as { name?: string } | undefined
        const id = (ulProp?.id || ul.locId || ul.locationId || ul.loc_id) as string
        const name = (ulProp?.property_name ||
          ulLoc?.name ||
          ul.location_name ||
          pData.find((item) => item.id === id)?.property_name) as string
        if (id && name) {
          propMap.set(id, { id, property_name: name })
        }
      })
    }

    // 3. Check defaultLocationId or default_location_id if propMap is empty
    const defaultLocId = selectedUser.default_location_id || selectedUser.defaultLocationId
    if (propMap.size === 0 && defaultLocId) {
      const defProp = pData.find((p) => p.id === defaultLocId)
      if (defProp) {
        propMap.set(defProp.id, { id: defProp.id, property_name: defProp.property_name })
      }
    }

    return Array.from(propMap.values())
  }, [selectedUser, pData])

  useEffect(() => {
    if (userAssignedProperties.length > 0) {
      if (!selectedPropertyId || !userAssignedProperties.some((p) => p.id === selectedPropertyId)) {
        const timer = setTimeout(() => setSelectedPropertyId(userAssignedProperties[0].id), 0)
        return () => clearTimeout(timer)
      }
    } else if (selectedPropertyId !== '') {
      const timer = setTimeout(() => setSelectedPropertyId(''), 0)
      return () => clearTimeout(timer)
    }
  }, [userAssignedProperties, selectedPropertyId])

  // Load location-specific permissions when user or property changes
  useEffect(() => {
    let isMounted = true

    const loadPermissions = async () => {
      if (!selectedUser || !selectedPropertyId) return
      try {
        const perms = await getUserLocationPermissionsAPI(selectedUser.id, selectedPropertyId)
        if (!isMounted) return
        const set = new Set<string>()
        perms.forEach((p) => {
          set.add(`${p.resourceKey}:${p.permission}`)
        })
        setActivePermissions(set)
        setSavedPermissions(set)
      } catch (err: unknown) {
        if (!isMounted) return
        console.warn('Error loading location permissions:', err)
        setActivePermissions(new Set())
        setSavedPermissions(new Set())
      }
    }

    loadPermissions()

    return () => {
      isMounted = false
    }
  }, [selectedUser, selectedPropertyId])

  /** A resource's level: how many of view → create → update → delete it holds in a row. */
  const levelOf = (key: string) => {
    // A module whose sections are all off is closed, whatever was stored for it.
    const sections = childrenOf.get(key) || []
    if (sections.length && !sections.some((r) => activePermissions.has(`${r.key}:view`))) return 0
    const missing = ACTIONS.findIndex((act) => !activePermissions.has(`${key}:${act}`))
    return missing === -1 ? ACTIONS.length : missing
  }

  /**
   * Set a level. On a module it applies to all its sections; on a section with any
   * access it also gives View on the module (a section needs its module), and setting
   * the module's last open section to None sets the module to None.
   */
  const setLevel = (key: string, level: number) => {
    const parentKey = rData.find((r) => r.key === key)?.parentKey || null
    const targets = [key, ...(childrenOf.get(key) || []).map((r) => r.key)]
    setActivePermissions((prev) => {
      const next = new Set(prev)
      for (const target of targets) {
        ACTIONS.forEach((act, i) => {
          if (i < level) next.add(`${target}:${act}`)
          else next.delete(`${target}:${act}`)
        })
      }
      if (parentKey && level > 0) next.add(`${parentKey}:view`)
      // The last section set to None closes the module too.
      if (parentKey && level === 0) {
        const siblings = (childrenOf.get(parentKey) || []).map((r) => r.key)
        if (!siblings.some((k) => next.has(`${k}:view`))) ACTIONS.forEach((act) => next.delete(`${parentKey}:${act}`))
      }
      return next
    })
  }

  const setEverything = (level: number) => modules.forEach((m) => setLevel(m.key, level))

  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const matches = (r: { name: string; description?: string | null }) =>
    !query || r.name.toLowerCase().includes(query) || (r.description || '').toLowerCase().includes(query)
  const visibleModules = modules.filter((m) => matches(m) || (childrenOf.get(m.key) || []).some(matches))
  const modulesWithAccess = modules.filter((m) => levelOf(m.key) > 0).length

  const handleSaveChanges = async () => {
    if (!selectedUser || !selectedPropertyId) return
    setSaveSuccessMsg(null)
    try {
      const payload: Array<{ resourceKey: string; permission: PermissionAction }> = []
      activePermissions.forEach((item) => {
        const [resourceKey, permission] = item.split(':') as [string, PermissionAction]
        if (resourceKey && permission) {
          payload.push({ resourceKey, permission })
        }
      })

      const saved = await saveLocationPermissionsMutation.mutateAsync({
        userId: selectedUser.id,
        locationId: selectedPropertyId,
        permissions: payload,
      })

      // Stay on the page with what the server stored (it may add implied permissions).
      const stored = Array.isArray(saved)
        ? new Set(
            (saved as Array<{ resourceKey: string; permission: string }>).map(
              (p) => `${p.resourceKey}:${p.permission}`,
            ),
          )
        : new Set(activePermissions)
      setActivePermissions(stored)
      setSavedPermissions(stored)

      const selectedProp = pData.find((p) => p.id === selectedPropertyId)
      notifySuccess(`Resource permissions saved for ${selectedProp?.property_name || 'selected property'}!`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save permissions.'
      notifyError('Failed to Save', message)
    }
  }

  const hasChanges =
    activePermissions.size !== savedPermissions.size || [...activePermissions].some((p) => !savedPermissions.has(p))

  const selectedPropertyName =
    userAssignedProperties.find((p) => p.id === selectedPropertyId)?.property_name ||
    pData.find((p) => p.id === selectedPropertyId)?.property_name ||
    'Property'

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              Role & Module Permissions
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Manage Location & Resource UBAC permissions across modules for selected user roles.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Select Location Dropdown */}
        <div className="pt-2">
          <label
            htmlFor="location-select"
            className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            Select Location / Property Scope
          </label>
          <select
            id="location-select"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            disabled={userAssignedProperties.length === 0}
            className="w-full sm:w-72 rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold shadow-xs disabled:opacity-50 disabled:bg-gray-50 cursor-pointer"
          >
            {userAssignedProperties.length > 0 ? (
              userAssignedProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_name}
                </option>
              ))
            ) : (
              <option value="" disabled>
                No properties assigned to this user
              </option>
            )}
          </select>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-700 font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          {saveSuccessMsg}
        </div>
      )}

      {/* Main Permissions Matrix Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-lg p-6 space-y-6">
        {/* Card Subheader + Save Changes Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Module Access Matrix for <span className="text-blue-600">{selectedPropertyName}</span>
            </h3>
            {selectedUser && (
              <p className="text-xs text-gray-500 mt-0.5">
                Configuring permissions for{' '}
                {`${selectedUser.profile?.firstName || selectedUser.profile?.first_name || ''} ${
                  selectedUser.profile?.lastName || selectedUser.profile?.last_name || ''
                }`.trim() || selectedUser.username}{' '}
                ({selectedUser.email || 'Staff'})
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Unsaved changes
                <button
                  type="button"
                  onClick={() => setActivePermissions(new Set(savedPermissions))}
                  className="cursor-pointer font-semibold text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
                >
                  Discard
                </button>
              </span>
            )}
            {onClose && (
              <Button variant="cancel" onClick={onClose} disabled={saveLocationPermissionsMutation.isPending}>
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveChanges}
              disabled={!hasChanges || saveLocationPermissionsMutation.isPending}
              title={hasChanges ? undefined : 'No changes to save'}
              isLoading={saveLocationPermissionsMutation.isPending}
            >
              Save Permissions
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-xs font-bold text-gray-800">How access levels work</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
            {LEVELS.map((l) => (
              <span key={l.level} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600">
                <span className={`h-2 w-2 rounded-full ${l.dot}`} />
                <span className="font-semibold text-gray-800">{l.label}</span> — {l.hint.toLowerCase()}
              </span>
            ))}
          </div>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-gray-500">
            <li>Each level includes everything before it.</li>
            <li>Setting a module sets all of its sections. Open a module to give sections a different level.</li>
            <li>A section only works if its module has at least View.</li>
          </ul>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules or sections…"
              aria-label="Search modules or sections"
              className="h-9 w-64 rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setExpanded(new Set(modules.map((m) => m.key)))}
              className="h-9 cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => setExpanded(new Set())}
              className="h-9 cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Collapse all
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">
              <span className="font-bold text-gray-900">{modulesWithAccess}</span> of {modules.length} modules with
              access
            </span>
            <button
              type="button"
              onClick={() => setEverything(4)}
              className="h-9 cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-3 font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Full access to all
            </button>
            <button
              type="button"
              onClick={() => setEverything(0)}
              className="h-9 cursor-pointer rounded-xl border border-gray-200 bg-white px-3 font-semibold text-gray-600 hover:bg-gray-50"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-2.5">
          {visibleModules.map((module) => {
            const subs = childrenOf.get(module.key) || []
            const isOpen = expanded.has(module.key) || (!!query && subs.some(matches))
            const level = levelOf(module.key)
            const subLevels = subs.map((sub) => levelOf(sub.key))
            const custom = subs.length > 0 && subLevels.some((l) => l !== level)
            const withAccess = subLevels.filter((l) => l > 0).length
            const summary =
              level === 0 && withAccess === 0
                ? 'No access'
                : custom
                  ? `Custom — ${withAccess} of ${subs.length} sections have access`
                  : `${LEVELS[level]!.label}${subs.length ? ` on all ${subs.length} sections` : ''}`
            return (
              <div
                key={module.key}
                className={`overflow-hidden rounded-2xl border transition-colors ${
                  level > 0 ? 'border-blue-100 bg-white' : 'border-gray-100 bg-gray-50/50'
                }`}
              >
                <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(module.key)}
                    disabled={subs.length === 0}
                    aria-expanded={isOpen}
                    className="flex min-w-0 cursor-pointer items-start gap-2 text-left disabled:cursor-default"
                  >
                    <ChevronRight
                      className={`mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                        isOpen ? 'rotate-90' : ''
                      } ${subs.length === 0 ? 'invisible' : ''}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-gray-900">{module.name}</span>
                      <span className="block text-[11px] text-gray-500">{module.description}</span>
                      <span
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          custom
                            ? 'bg-violet-50 text-violet-700'
                            : level > 0
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {summary}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {custom && <span className="text-[10px] font-semibold text-violet-600">Set all sections:</span>}
                    <LevelSelector value={level} onChange={(l) => setLevel(module.key, l)} label={module.name} />
                  </div>
                </div>

                {isOpen && subs.length > 0 && (
                  <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-slate-50/60">
                    {subs
                      .filter((sub) => !query || matches(module) || matches(sub))
                      .map((sub) => {
                        const subLevel = levelOf(sub.key)
                        return (
                          <li
                            key={sub.key}
                            className="flex flex-col gap-2 py-2.5 pl-10 pr-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="min-w-0 border-l-2 border-gray-200 pl-3">
                              <p className="text-xs font-semibold text-gray-800">{sub.name}</p>
                              <p className="text-[11px] text-gray-500">{sub.description}</p>
                            </div>
                            <LevelSelector
                              value={subLevel}
                              onChange={(l) => setLevel(sub.key, l)}
                              label={`${module.name} – ${sub.name}`}
                              compact
                            />
                          </li>
                        )
                      })}
                  </ul>
                )}
              </div>
            )
          })}
          {visibleModules.length === 0 && (
            <p className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400">
              No modules or sections match “{search}”.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
