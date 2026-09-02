import { flexRender, type Table as TableType } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface TanstackBasicTableProps<TData> {
  table: TableType<TData>
  onRowSelect?: (rowData: TData) => void
}

export default function BasicTable<TData>({ table, onRowSelect }: TanstackBasicTableProps<TData>) {
  const hasData = table.getRowModel().rows.length > 0

  return (
    <Table>
      <TableHeader className="bg-gray-50">
        {table.getHeaderGroups().map((header) => (
          <TableRow key={header.id} className="hover:bg-transparent">
            {header.headers.map((header) => (
              <TableHead key={header.id} className="font-semibold text-gray-700">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {hasData ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onRowSelect?.(row.original)}
              className={cn(onRowSelect && 'cursor-pointer hover:bg-muted/50')}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={table.getAllColumns().length} className="text-center py-12 text-gray-500">
              No data available
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
