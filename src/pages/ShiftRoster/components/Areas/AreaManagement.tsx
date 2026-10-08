import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Building2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import type { RosterArea } from '@/lib/services/rosterService'
import { RosterPermission } from '../RosterPermission'
import AddAreaDialog from '../dialogs/AddAreaDialog'
import { useDeleteArea, useListAreas } from '@/hooks/react-query/roster'

const AreaManagement = () => {
  const { data, isLoading } = useListAreas({ page: 1, limit: 100 })
  const deleteArea = useDeleteArea()
  const areas: RosterArea[] = useMemo(() => {
    const raw = data?.data as { areas?: RosterArea[] }
    return raw?.areas || []
  }, [data])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RosterArea | null>(null)

  const columns: ColumnDef<RosterArea>[] = [
    {
      accessorKey: 'areaName',
      header: 'Area',
      cell: ({ row }) => (
        <div className="flex min-w-[180px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
            <MapPin className="h-4 w-4" />
          </div>
          <span className="font-semibold text-gray-900">{row.original.areaName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'areaType',
      header: 'Type',
      cell: ({ row }) =>
        row.original.areaType ? (
          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {row.original.areaType}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) =>
        row.original.location ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            {row.original.location}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = String(row.original.status ?? '').toLowerCase() !== 'inactive'
        return isActive ? (
          <Badge className="border border-green-200 bg-green-50 text-green-700">Active</Badge>
        ) : (
          <Badge className="border border-gray-200 bg-gray-100 text-gray-600">Inactive</Badge>
        )
      },
    },
    {
      id: 'actions',
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          <RosterPermission action="update">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Edit ${row.original.areaName}`}
              title="Edit area"
              className="h-8 w-8 shrink-0 p-0"
              onClick={() => {
                setEditing(row.original)
                setOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </RosterPermission>
          <RosterPermission action="delete">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Delete ${row.original.areaName}`}
              title="Delete area"
              className="h-8 w-8 shrink-0 p-0 text-red-600 hover:text-red-700"
              onClick={() => {
                if (window.confirm(`Delete "${row.original.areaName}"?`)) {
                  deleteArea.mutate(row.original.id)
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </RosterPermission>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={areas}
        isLoading={isLoading}
        filterKey="areaName"
        searchPlaceholder="Search areas…"
        filterActions={
          <RosterPermission action="create">
            <Button
              size="sm"
              className="bg-[#005390] hover:bg-[#004170] text-white rounded-xl h-9 text-xs font-bold px-4"
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Area
            </Button>
          </RosterPermission>
        }
      />
      <AddAreaDialog open={open} onOpenChange={setOpen} area={editing} />
    </div>
  )
}

export default AreaManagement
