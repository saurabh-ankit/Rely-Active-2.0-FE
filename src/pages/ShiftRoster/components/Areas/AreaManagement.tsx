import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useDeleteArea, useListAreas } from '@/hooks/react-query/roster'
import type { RosterArea } from '@/lib/services/rosterService'
import { RosterPermission } from '../RosterPermission'
import AddAreaDialog from '../dialogs/AddAreaDialog'

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
    { accessorKey: 'areaName', header: 'Name' },
    { accessorKey: 'areaType', header: 'Type' },
    { accessorKey: 'location', header: 'Location' },
    { accessorKey: 'status', header: 'Status' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <RosterPermission action="update">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(row.original)
                setOpen(true)
              }}
            >
              Edit
            </Button>
          </RosterPermission>
          <RosterPermission action="delete">
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
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
      <div className="flex justify-end">
        <RosterPermission action="create">
          <Button
            size="sm"
            className="bg-[#2a517c] hover:bg-[#476587] text-white"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Area
          </Button>
        </RosterPermission>
      </div>
      <DataTable
        columns={columns}
        data={areas}
        isLoading={isLoading}
        filterKey="areaName"
        searchPlaceholder="Search areas…"
      />
      <AddAreaDialog open={open} onOpenChange={setOpen} area={editing} />
    </div>
  )
}

export default AreaManagement
