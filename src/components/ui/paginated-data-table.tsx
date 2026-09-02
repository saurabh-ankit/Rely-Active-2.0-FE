import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { type Dispatch, type SetStateAction } from 'react'
import BasicTable from './basic-table'
import BasicTablePagination from './basic-table-pagination'

export interface UseGetTableResponseType<TData> {
  pageSize: number
  pageIndex: number
  totalRecords: number
  data: TData[]
}

export interface TableProps<TData, TValue> {
  isDataLoading?: boolean
  paginatedData: UseGetTableResponseType<TData>
  columns: ColumnDef<TData, TValue>[]
  pagination?: PaginationState
  setPagination?: Dispatch<SetStateAction<PaginationState>>
  columnFilters?: ColumnFiltersState
  setColumnFilters?: Dispatch<SetStateAction<ColumnFiltersState>>
  sorting?: SortingState
  setSorting?: Dispatch<SetStateAction<SortingState>>
  onRowSelect?: (rowData: TData) => void
}

export default function PaginatedDataTable<TData, TValue>({
  columns,
  paginatedData,
  pagination,
  setPagination,
  columnFilters,
  setColumnFilters,
  sorting,
  setSorting,
  onRowSelect,
}: TableProps<TData, TValue>) {
  const safePaginatedData = paginatedData || {
    data: [],
    pageSize: 10,
    pageIndex: 0,
    totalRecords: 0,
  }

  const safePagination = pagination || {
    pageIndex: 0,
    pageSize: safePaginatedData.pageSize || 10,
  }

  const table = useReactTable({
    data: safePaginatedData.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    manualFiltering: true,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    rowCount: safePaginatedData?.totalRecords ?? 0,
    pageCount: Math.ceil((safePaginatedData?.totalRecords || 0) / (safePaginatedData?.pageSize || 1)),
    manualSorting: true,
    onSortingChange: setSorting,
    manualPagination: true,
    state: {
      sorting: sorting || [],
      pagination: safePagination,
      columnFilters: columnFilters || [],
    },
  })

  return (
    <>
      <div className="relative rounded-xl border mb-4">
        <BasicTable table={table} onRowSelect={onRowSelect} />
      </div>
      {safePaginatedData?.totalRecords > 0 && (
        <div className="w-full">
          <BasicTablePagination table={table} />
        </div>
      )}
    </>
  )
}
