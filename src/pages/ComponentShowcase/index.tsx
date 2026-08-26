import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, selectionColumn } from '@/components/ui/data-table'

type Member = { name: string; role: string; status: string }
const data: Member[] = [
  { name: 'Aarav Mehta', role: 'Community manager', status: 'Active' },
  { name: 'Mira Shah', role: 'Experience lead', status: 'Invited' },
  { name: 'Kabir Rao', role: 'Operations', status: 'Active' },
]
const columns: ColumnDef<Member>[] = [
  selectionColumn<Member>(),
  { accessorKey: 'name', header: 'Member' },
  { accessorKey: 'role', header: 'Role' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
  },
]
export default function ComponentShowcase() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Component showcase</h1>
        <p className="text-muted-foreground">The complete local shadcn source library and reusable compositions.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Team directory</CardTitle>
          <CardDescription>Filtering, selection, column visibility, and pagination.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} filterKey="name" />
        </CardContent>
      </Card>
    </div>
  )
}
