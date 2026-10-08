import { useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useDebounce } from '@/hooks/useDebounce'
import { useLocation } from '@/hooks/useLocation'
import { useAdvertisements, useDeleteAdvertisement, useUpdateAdvertisementStatus } from '@/hooks/react-query/feedback'
import type { Advertisement } from '@/lib/types/feedback'
import AdvertisementModal from './components/AdvertisementModal'
import ConfirmDialog from './components/ConfirmDialog'
import FeedbackPermission from './components/FeedbackPermission'

const PAGE_SIZE = 10

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

/** Runs a row action without also triggering the row's own click. */
const stop = (e: MouseEvent, action: () => void) => {
  e.stopPropagation()
  action()
}

const AdvertisementsPage = () => {
  const navigate = useNavigate()
  const { hasResourcePermission } = useLocation()
  const canUpdate = hasResourcePermission('SETTINGS', 'update')
  const canDelete = hasResourcePermission('SETTINGS', 'delete')

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [pageIndex, setPageIndex] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Advertisement | null>(null)
  const [deleting, setDeleting] = useState<Advertisement | null>(null)

  const { data, isLoading } = useAdvertisements({
    search: debouncedSearch || undefined,
    ...(status === 'ALL' ? {} : { isActive: status === 'ACTIVE' }),
    page: pageIndex + 1,
    limit: PAGE_SIZE,
  })
  const statusMutation = useUpdateAdvertisementStatus()
  const deleteMutation = useDeleteAdvertisement()

  const advertisements = data?.data?.advertisements ?? []
  const pagination = data?.data?.pagination

  const openModal = (ad: Advertisement | null) => {
    setEditing(ad)
    setModalOpen(true)
  }

  const columns = useMemo<ColumnDef<Advertisement>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Advertisement',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <img
              src={row.original.imageUrl}
              alt={row.original.title}
              className="h-12 w-20 shrink-0 rounded-md border object-cover"
            />
            <span className="font-medium text-gray-900">{row.original.title}</span>
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) =>
          row.original.description ? (
            <span className="line-clamp-2 max-w-md text-gray-600">{row.original.description}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Added On',
        cell: ({ row }) => format(new Date(row.original.createdAt), 'dd MMM yyyy'),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const ad = row.original
          return canUpdate ? (
            <div className="flex items-center gap-2">
              <Switch
                checked={ad.isActive}
                disabled={statusMutation.isPending}
                aria-label={ad.isActive ? 'Deactivate advertisement' : 'Activate advertisement'}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={(checked) => statusMutation.mutate({ id: ad.id, isActive: checked })}
                className="data-checked:bg-green-600"
              />
              <span className={ad.isActive ? 'text-sm font-medium text-green-700' : 'text-sm text-gray-500'}>
                {ad.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ) : (
            <Badge className={ad.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}>
              {ad.isActive ? 'Active' : 'Inactive'}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {canUpdate && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Edit advertisement"
                onClick={(e) => stop(e, () => openModal(row.original))}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete advertisement"
                className="text-red-600 hover:text-red-700"
                onClick={(e) => stop(e, () => setDeleting(row.original))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canUpdate, canDelete, statusMutation],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Advertisements"
        description="Upload advertisements shown to residents and employees of this property."
        onBack={() => navigate('/admin/settings')}
        actions={
          <FeedbackPermission action="create">
            <Button onClick={() => openModal(null)} size="sm" className="bg-[#2a517c] hover:bg-[#476587] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Upload New Ad
            </Button>
          </FeedbackPermission>
        }
      />

      <DataTable
        columns={columns}
        data={advertisements}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPageIndex(0)
        }}
        searchPlaceholder="Search advertisements..."
        filterActions={
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as StatusFilter)
              setPageIndex(0)
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        }
        manualPagination
        pageSize={PAGE_SIZE}
        pageIndex={pageIndex}
        pageCount={pagination?.totalPages ?? 1}
        totalCount={pagination?.total ?? 0}
        onPageChange={setPageIndex}
        getRowId={(row) => row.id}
        {...(canUpdate ? { onRowClick: (row: Advertisement) => openModal(row) } : {})}
      />

      {modalOpen && <AdvertisementModal open onOpenChange={setModalOpen} advertisement={editing} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete advertisement?"
        description={`"${deleting?.title ?? ''}" will be removed and residents will no longer see it.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

export default AdvertisementsPage
