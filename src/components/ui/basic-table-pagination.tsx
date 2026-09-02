import { useEffect, useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useDebounce from '@/hooks/useDebounce'

interface BasicTablePaginationProps<TData> {
  table: Table<TData>
}

export default function BasicTablePagination<TData>({ table }: BasicTablePaginationProps<TData>) {
  const [goToPage, setGoToPage] = useState('')
  const [isValid, setIsValid] = useState(true)
  const debouncedGoToPage = useDebounce(goToPage, 500)

  const paginationState = table.getState().pagination || { pageIndex: 0, pageSize: 10 }

  useEffect(() => {
    if (debouncedGoToPage && debouncedGoToPage !== '') {
      const pageNumber = parseInt(debouncedGoToPage)
      if (pageNumber >= 1 && pageNumber <= table.getPageCount()) {
        table.setPageIndex(pageNumber - 1)
        setGoToPage('')
        setIsValid(true)
      } else {
        setIsValid(false)
      }
    }
  }, [debouncedGoToPage, table])

  return (
    <div className="py-2 w-full flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Page</span>
        <span className="font-semibold">{paginationState.pageIndex + 1}</span>
        <span>of</span>
        <span className="font-semibold">{table.getPageCount()}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="1"
          max={table.getPageCount()}
          value={goToPage}
          onChange={(e) => {
            setGoToPage(e.target.value)
            if (!isValid) setIsValid(true)
          }}
          className={`w-20 h-9 text-center ${!isValid && goToPage !== '' ? 'border-red-500' : ''}`}
          placeholder="Page"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
