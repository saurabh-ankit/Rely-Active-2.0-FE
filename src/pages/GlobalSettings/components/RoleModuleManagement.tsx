import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Building2, Check, Save, ShieldCheck, X } from 'lucide-react'
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

export const RoleModuleManagement: React.FC<RoleModuleManagementProps> = ({ initialUser, onClose }) => {
  const { userId: targetParamUserId } = useParams<{ userId?: string }>()
  const targetUserId = initialUser?.id || targetParamUserId

  const { data: uData = [] } = useUsersQuery(undefined, null)
  const { data: fetchedUser } = useUserByIdQuery(targetUserId)
  const { data: rData = [] } = useResourcesQuery()
  const { data: pData = [] } = usePropertiesQuery()
  const saveLocationPermissionsMutation = useSaveUserLocationPermissionsMutation()

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(initialUser || null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [activePermissions, setActivePermissions] = useState<Set<string>>(new Set())
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
      } catch (err: unknown) {
        if (!isMounted) return
        console.warn('Error loading location permissions:', err)
        setActivePermissions(new Set())
      }
    }

    loadPermissions()

    return () => {
      isMounted = false
    }
  }, [selectedUser, selectedPropertyId])

  const togglePermission = (resourceKey: string, action: PermissionAction) => {
    const permKey = `${resourceKey}:${action}`
    setActivePermissions((prev) => {
      const next = new Set(prev)
      if (next.has(permKey)) next.delete(permKey)
      else next.add(permKey)
      return next
    })
  }

  const toggleRowAll = (resourceKey: string) => {
    const actions: PermissionAction[] = ['view', 'create', 'update', 'delete']
    const allChecked = actions.every((act) => activePermissions.has(`${resourceKey}:${act}`))

    setActivePermissions((prev) => {
      const next = new Set(prev)
      actions.forEach((act) => {
        const k = `${resourceKey}:${act}`
        if (allChecked) next.delete(k)
        else next.add(k)
      })
      return next
    })
  }

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

      await saveLocationPermissionsMutation.mutateAsync({
        userId: selectedUser.id,
        locationId: selectedPropertyId,
        permissions: payload,
      })

      const selectedProp = pData.find((p) => p.id === selectedPropertyId)
      notifySuccess(`Resource permissions saved for ${selectedProp?.property_name || 'selected property'}!`)
      if (onClose) {
        setTimeout(() => onClose(), 600)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save permissions.'
      notifyError('Failed to Save', message)
    }
  }

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
            {onClose && (
              <Button variant="cancel" onClick={onClose} disabled={saveLocationPermissionsMutation.isPending}>
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveChanges}
              isLoading={saveLocationPermissionsMutation.isPending}
            >
              Save Permissions
            </Button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-1/3">Resource Module</th>
                <th className="py-3 px-4 text-center">View</th>
                <th className="py-3 px-4 text-center">Create</th>
                <th className="py-3 px-4 text-center">Update</th>
                <th className="py-3 px-4 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rData.map((r) => {
                const isAllRowChecked = ['view', 'create', 'update', 'delete'].every((act) =>
                  activePermissions.has(`${r.key}:${act}`),
                )

                return (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between pr-4">
                        <div>
                          <span className="font-bold text-gray-900 block">{r.name}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{r.description || r.key}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleRowAll(r.key)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            isAllRowChecked
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {isAllRowChecked ? 'Unselect All' : 'Select All'}
                        </button>
                      </div>
                    </td>

                    {(['view', 'create', 'update', 'delete'] as PermissionAction[]).map((action) => {
                      const isChecked = activePermissions.has(`${r.key}:${action}`)

                      return (
                        <td key={action} className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(r.key, action)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
