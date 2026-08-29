import { useState } from 'react'
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterKey?: string
  isLoading?: boolean
  error?: string
  pageSize?: number
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filterActions?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterKey,
  isLoading,
  error,
  pageSize = 10,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records…',
  filterActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [filters, setFilters] = useState<ColumnFiltersState>([])
  const [visibility, setVisibility] = useState<VisibilityState>({})
  const [selection, setSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters: filters, columnVisibility: visibility, rowSelection: selection },
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading)
    return (
      <div className="flex flex-col gap-3 p-4" aria-label="Loading table">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )

  if (error)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Unable to load data</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const pageCount = table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex
  const totalRows = table.getFilteredRowModel().rows.length

  const showSearchBar = onSearchChange !== undefined || filterKey !== undefined

  return (
    <div className="flex flex-col gap-4">
      {/* Top Search Bar & Filters */}
      {(showSearchBar || filterActions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {showSearchBar ? (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="text"
                className="pl-9 pr-4 py-2 w-full rounded-xl text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-2xs focus:ring-2 focus:ring-[#005390]/20"
                placeholder={searchPlaceholder}
                value={
                  onSearchChange !== undefined
                    ? (searchValue ?? '')
                    : ((table.getColumn(filterKey!)?.getFilterValue() as string) ?? '')
                }
                onChange={(event) => {
                  if (onSearchChange) {
                    onSearchChange(event.target.value)
                  } else if (filterKey) {
                    table.getColumn(filterKey)?.setFilterValue(event.target.value)
                  }
                }}
              />
            </div>
          ) : (
            <div />
          )}
          {filterActions && <div className="flex items-center gap-2 flex-wrap">{filterActions}</div>}
        </div>
      )}

      {/* Main Table Container (Assist Styling) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/90 text-gray-700 font-semibold border-b border-gray-200 dark:bg-gray-800/80 dark:border-gray-800 dark:text-gray-200 uppercase text-[10px] tracking-wider">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent border-b border-gray-200 dark:border-gray-800">
                  {group.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="py-3.5 px-4 text-xs font-bold text-gray-700 dark:text-gray-200"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800/60"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3.5 px-4 text-xs text-gray-700 dark:text-gray-300">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-12 text-center">
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle className="text-base font-bold text-gray-800">No records found</EmptyTitle>
                        <EmptyDescription className="text-xs text-gray-400">
                          Try adjusting your search or filter terms.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Footer - Always Visible */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
          {selectedCount > 0 && (
            <span className="rounded-full bg-[#005390]/10 px-2.5 py-0.5 font-semibold text-[#005390]">
              {selectedCount} selected
            </span>
          )}
          <span>
            Total <span className="font-bold text-gray-900 dark:text-white">{totalRows}</span> records
          </span>
          <span>
            • Page <span className="font-bold text-gray-900 dark:text-white">{currentPage + 1}</span> of{' '}
            <span className="font-bold text-gray-900 dark:text-white">{Math.max(1, pageCount)}</span>
          </span>
        </div>

        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (table.getCanPreviousPage()) table.previousPage()
                }}
                className={
                  !table.getCanPreviousPage()
                    ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500'
                    : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-200'
                }
              />
            </PaginationItem>

            {Array.from({ length: Math.max(1, pageCount) }).map((_, idx) => {
              const totalP = Math.max(1, pageCount)
              if (idx === 0 || idx === totalP - 1 || (idx >= currentPage - 1 && idx <= currentPage + 1)) {
                return (
                  <PaginationItem key={idx}>
                    <PaginationLink
                      href="#"
                      isActive={idx === currentPage}
                      onClick={(e) => {
                        e.preventDefault()
                        table.setPageIndex(idx)
                      }}
                      className="cursor-pointer text-xs h-8 w-8 rounded-xl font-bold"
                    >
                      {idx + 1}
                    </PaginationLink>
                  </PaginationItem>
                )
              } else if ((idx === 1 && currentPage > 2) || (idx === totalP - 2 && currentPage < totalP - 3)) {
                return (
                  <PaginationItem key={idx}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              }
              return null
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (table.getCanNextPage()) table.nextPage()
                }}
                className={
                  !table.getCanNextPage()
                    ? 'pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500'
                    : 'cursor-pointer bg-white text-gray-700 hover:bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-200'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

export function selectionColumn<T>(): ColumnDef<T> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}
