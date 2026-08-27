import React, { useEffect, useState } from 'react'
import { Building2, Check, Save, ShieldCheck, UserCheck } from 'lucide-react'
import { propertyApi } from '@/api/property'
import { rbacApi, type ResourceItem, type UserItem } from '@/api/rbac'
import type { Property } from '@/pages/Property/types'
import { CommonButton } from '@/components/common/CommonButton'

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

export const RoleModuleManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([])
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')

  // Set of keys formatted as `${resourceKey}:${permission}` (e.g., `INVENTORY:view`)
  const [activePermissions, setActivePermissions] = useState<Set<string>>(new Set())

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)

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
          const nameA = a.profile?.first_name || ''
          const nameB = b.profile?.first_name || ''
          return nameA.localeCompare(nameB)
        })

        setUsers(sortedUsers)
        setResources(rData)
        setProperties(pData)

        if (sortedUsers.length > 0) {
          setSelectedUser(sortedUsers[0])
        }
        if (pData.length > 0) {
          setSelectedPropertyId(pData[0].id)
        }
      } catch (err: unknown) {
        console.warn('Error fetching UBAC resources & locations:', err)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [])

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
      setSaveSuccessMsg(`Resource permissions saved for ${selectedProp?.property_name || 'selected property'}!`)
      setTimeout(() => setSaveSuccessMsg(null), 3000)
    } catch (err: unknown) {
      console.error('Failed to save location permissions:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedPropertyName = properties.find((p) => p.id === selectedPropertyId)?.property_name || 'Property'

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            Resource Permissions
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage Location & Resource UBAC permissions across modules for selected user roles.
          </p>
        </div>

        {/* User Selection Chips */}
        <div className="space-y-1.5 pt-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Select User Role / Admin:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id
              const fullName =
                `${u.profile?.first_name || ''} ${u.profile?.last_name || ''}`.trim() || u.email || 'User'
              const roleTitle = u.userRoles?.[0]?.role?.name || u.userRoles?.[0]?.role?.code || 'User'

              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUser(u)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                      : 'bg-white/80 border border-gray-200/80 text-gray-700 hover:bg-white'
                  }`}
                >
                  <UserCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                  <span>{fullName}</span>
                  <span className={`text-[10px] opacity-80 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                    ({roleTitle})
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Select Location Dropdown */}
        <div className="pt-2">
          <label
            htmlFor="location-select"
            className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            Select Location
          </label>
          <select
            id="location-select"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="w-full sm:w-72 rounded-xl border border-gray-200 bg-white py-2.5 px-3.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold shadow-xs"
          >
            {properties.map((p) => (
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
              Resource Permissions for <span className="text-blue-600">{selectedPropertyName}</span>
            </h3>
            {selectedUser && (
              <p className="text-xs text-gray-500 mt-0.5">
                Configuring permissions for {selectedUser.profile?.first_name} {selectedUser.profile?.last_name} (
                {selectedUser.email || 'Admin'})
              </p>
            )}
          </div>

          <CommonButton
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            isLoading={isSaving}
            onClick={handleSaveChanges}
          >
            Save Changes
          </CommonButton>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200/80 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-1/3">Resource</th>
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
