import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Building2, Check, Save, ShieldCheck, X } from 'lucide-react'
import { propertyApi } from '@/api/property'
import { rbacApi, type ResourceItem, type UserItem } from '@/api/rbac'
import type { Property } from '@/pages/Property/types'
import { CommonButton } from '@/components/common/CommonButton'
import { notifyError, notifySuccess } from '@/utils/toast'

const ROLE_HIERARCHY_ORDER: Record<string, number> = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  DOCTOR: 4,
  NURSE: 5,
  EMPLOYEE: 6,
  CARETAKER: 7,
  VENDOR: 8,
  RESIDENT: 9,
}

type PermissionAction = 'view' | 'create' | 'update' | 'delete'

interface RoleModuleManagementProps {
  initialUser?: UserItem | null
  onClose?: () => void
}

export const RoleModuleManagement: React.FC<RoleModuleManagementProps> = ({ initialUser, onClose }) => {
  const { userId: targetParamUserId } = useParams<{ userId?: string }>()
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(initialUser || null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [activePermissions, setActivePermissions] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)

  const isSa = selectedUser?.userRoles?.some((ur) => ur.role?.code === 'SUPER_ADMIN')

  const userAssignedProperties = React.useMemo(() => {
    if (!selectedUser) return properties
    if (!isSa && selectedUser.assignedProperties && selectedUser.assignedProperties.length > 0) {
      return selectedUser.assignedProperties
    }
    return properties
  }, [selectedUser, properties, isSa])

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const [uData, rData, pData] = await Promise.all([
          rbacApi.getUsers(),
          rbacApi.getResources(),
          propertyApi.getAll(),
        ])

        if (!isMounted) return

        const sortedUsers = [...uData].sort((a, b) => {
          const roleA = a.userRoles?.[0]?.role?.code || ''
          const roleB = b.userRoles?.[0]?.role?.code || ''
          const rankA = ROLE_HIERARCHY_ORDER[roleA] ?? 99
          const rankB = ROLE_HIERARCHY_ORDER[roleB] ?? 99
          if (rankA !== rankB) return rankA - rankB
          const nameA = a.profile?.firstName || a.profile?.first_name || ''
          const nameB = b.profile?.firstName || b.profile?.first_name || ''
          return nameA.localeCompare(nameB)
        })

        setResources(rData)
        setProperties(pData)

        const targetUserId = initialUser?.id || targetParamUserId
        let targetUserObj: UserItem | null = null
        if (targetUserId) {
          targetUserObj = sortedUsers.find((u) => u.id === targetUserId) || initialUser || null
        } else if (sortedUsers.length > 0) {
          targetUserObj = sortedUsers[0]
        }
        setSelectedUser(targetUserObj)

        const isTargetSa = targetUserObj?.userRoles?.some((ur) => ur.role?.code === 'SUPER_ADMIN')
        const assignedProps =
          targetUserObj &&
          !isTargetSa &&
          targetUserObj.assignedProperties &&
          targetUserObj.assignedProperties.length > 0
            ? targetUserObj.assignedProperties
            : pData

        if (assignedProps.length > 0) {
          setSelectedPropertyId(assignedProps[0].id)
        }
      } catch (err: unknown) {
        console.warn('Error fetching UBAC resources & locations:', err)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [initialUser, targetParamUserId])

  // Load location-specific permissions when user or property changes
  useEffect(() => {
    let isMounted = true

    const loadPermissions = async () => {
      if (!selectedUser || !selectedPropertyId) return
      try {
        const perms = await rbacApi.getUserLocationPermissions(selectedUser.id, selectedPropertyId)
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
    setIsSaving(true)
    setSaveSuccessMsg(null)
    try {
      const payload: Array<{ resourceKey: string; permission: PermissionAction }> = []
      activePermissions.forEach((item) => {
        const [resourceKey, permission] = item.split(':') as [string, PermissionAction]
        if (resourceKey && permission) {
          payload.push({ resourceKey, permission })
        }
      })

      await rbacApi.saveUserLocationPermissions(selectedUser.id, selectedPropertyId, payload)
      const selectedProp = properties.find((p) => p.id === selectedPropertyId)
      notifySuccess(`Resource permissions saved for ${selectedProp?.property_name || 'selected property'}!`)
      if (onClose) {
        setTimeout(() => onClose(), 600)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save location permissions.'
      console.error('Failed to save location permissions:', err)
      notifyError('Save Failed', msg)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedPropertyName =
    userAssignedProperties.find((p) => p.id === selectedPropertyId)?.property_name ||
    properties.find((p) => p.id === selectedPropertyId)?.property_name ||
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
            className="w-full sm:w-72 rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold shadow-xs"
          >
            {userAssignedProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.property_name}
              </option>
            ))}
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

          <div className="flex items-center gap-2">
            {onClose && (
              <CommonButton variant="cancel" onClick={onClose}>
                Cancel
              </CommonButton>
            )}
            <CommonButton
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              isLoading={isSaving}
              onClick={handleSaveChanges}
            >
              Save Permissions
            </CommonButton>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200/80 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-1/3">Resource Module</th>
                <th className="py-3 px-4 text-center">View</th>
                <th className="py-3 px-4 text-center">Create</th>
                <th className="py-3 px-4 text-center">Update</th>
                <th className="py-3 px-4 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resources.map((res) => {
                const isView = activePermissions.has(`${res.key}:view`)
                const isCreate = activePermissions.has(`${res.key}:create`)
                const isUpdate = activePermissions.has(`${res.key}:update`)
                const isDelete = activePermissions.has(`${res.key}:delete`)

                return (
                  <tr key={res.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleRowAll(res.key)}
                          className="font-bold text-gray-900 hover:text-blue-600 cursor-pointer text-left"
                        >
                          {res.name}
                        </button>
                      </div>
                      {res.description && <div className="text-[10px] text-gray-400 mt-0.5">{res.description}</div>}
                    </td>

                    {/* View */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isView}
                        onChange={() => togglePermission(res.key, 'view')}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Create */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isCreate}
                        onChange={() => togglePermission(res.key, 'create')}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Update */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isUpdate}
                        onChange={() => togglePermission(res.key, 'update')}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Delete */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isDelete}
                        onChange={() => togglePermission(res.key, 'delete')}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
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
