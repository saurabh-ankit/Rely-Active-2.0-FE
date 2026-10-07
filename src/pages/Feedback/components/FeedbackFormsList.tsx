import { useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { BarChart3, Eye, Pencil, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebounce } from '@/hooks/useDebounce'
import { useLocation } from '@/hooks/useLocation'
import { useDeleteFeedbackForm, useFeedbackForms } from '@/hooks/react-query/feedback'
import type { FeedbackAudience, FeedbackForm, FeedbackFormStatusFilter } from '@/lib/types/feedback'
import ConfirmDialog from './ConfirmDialog'
import FormStatusBadge from './FormStatusBadge'
import SendFormDialog from './SendFormDialog'

const PAGE_SIZE = 10

const AUDIENCE_LABEL: Record<FeedbackAudience, string> = {
  RESIDENTS: 'Residents',
  EMPLOYEES: 'Employees',
  BOTH: 'Residents & Employees',
}

type StatusFilter = FeedbackFormStatusFilter | 'ALL'

/** Runs a row action without also triggering the row's own click. */
const stop = (e: MouseEvent, action: () => void) => {
  e.stopPropagation()
  action()
}

const FeedbackFormsList = () => {
  const navigate = useNavigate()
  const { hasResourcePermission } = useLocation()
  const canUpdate = hasResourcePermission('SETTINGS', 'update')
  const canDelete = hasResourcePermission('SETTINGS', 'delete')

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [pageIndex, setPageIndex] = useState(0)

  const [sending, setSending] = useState<FeedbackForm | null>(null)
  const [deleting, setDeleting] = useState<FeedbackForm | null>(null)

  const { data, isLoading } = useFeedbackForms({
    search: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    page: pageIndex + 1,
    limit: PAGE_SIZE,
  })
  const deleteMutation = useDeleteFeedbackForm()

  const forms = data?.data?.forms ?? []
  const pagination = data?.data?.pagination

  const columns = useMemo<ColumnDef<FeedbackForm>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Form Title',
        cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.title}</span>,
      },
      {
        accessorKey: 'expiryDate',
        header: 'Expires On',
        cell: ({ row }) => format(new Date(row.original.expiryDate), 'dd MMM yyyy'),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <FormStatusBadge form={row.original} />,
      },
      {
        id: 'audience',
        header: 'Sent To',
        cell: ({ row }) =>
          row.original.audience ? (
            AUDIENCE_LABEL[row.original.audience]
          ) : (
            <span className="text-gray-400">Not sent</span>
          ),
      },
      {
        id: 'responses',
        header: 'Responses',
        cell: ({ row }) =>
          row.original.status === 'SENT' ? (
            <span>
              {row.original.responseCount ?? 0} / {row.original.recipientCount ?? 0}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const form = row.original
          const canEdit = form.isEditable && canUpdate
          return (
            <div className="flex items-center justify-end gap-1">
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Edit form"
                  onClick={(e) => stop(e, () => navigate(`/admin/settings/feedback/forms/edit/${form.id}`))}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="View form"
                  onClick={(e) => stop(e, () => navigate(`/admin/settings/feedback/forms/edit/${form.id}`))}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {form.status === 'DRAFT' && canUpdate && !form.isExpired && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Send form"
                  onClick={(e) => stop(e, () => setSending(form))}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
              {form.status === 'SENT' && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="View responses"
                  onClick={(e) => stop(e, () => navigate(`/admin/settings/feedback/forms/${form.id}/responses`))}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete form"
                  className="text-red-600 hover:text-red-700"
                  onClick={(e) => stop(e, () => setDeleting(form))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [navigate, canUpdate, canDelete],
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={forms}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPageIndex(0)
        }}
        searchPlaceholder="Search forms..."
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
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
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
        onRowClick={(row) =>
          navigate(
            row.isEditable
              ? `/admin/settings/feedback/forms/edit/${row.id}`
              : `/admin/settings/feedback/forms/${row.id}/responses`,
          )
        }
      />

      <SendFormDialog open={!!sending} onOpenChange={(open) => !open && setSending(null)} form={sending} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete feedback form?"
        description={
          deleting?.status === 'SENT'
            ? `"${deleting.title}" and all its responses will be removed, and recipients will no longer see it.`
            : `"${deleting?.title ?? ''}" will be removed.`
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

export default FeedbackFormsList
