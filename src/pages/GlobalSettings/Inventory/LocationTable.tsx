import { Controller, useFormContext } from 'react-hook-form'
import { DataTable } from '@/components/ui/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
export interface LocationOption {
  id: string
  name: string
  disabled?: boolean
}
export function LocationTable({ options }: { options: LocationOption[] }) {
  const { control } = useFormContext()
  return (
    <Controller
      name="locationIds"
      control={control}
      render={({ field, fieldState }) => {
        const selected = field.value as string[]
        const allowed = options.filter((o) => !o.disabled).map((o) => o.id)
        const all = allowed.length > 0 && allowed.every((id) => selected.includes(id))
        return (
          <>
            <DataTable
              data={options}
              filterKey="name"
              searchPlaceholder="Search locations…"
              getRowId={(r) => r.id}
              filterActions={
                <Button
                  type="button"
                  variant="outline"
                  disabled={!allowed.length}
                  onClick={() =>
                    field.onChange(
                      all ? selected.filter((id) => !allowed.includes(id)) : [...new Set([...selected, ...allowed])],
                    )
                  }
                >
                  {all ? 'Deselect All' : 'Select All'}
                </Button>
              }
              columns={[
                { accessorKey: 'name', header: 'Location' },
                {
                  id: 'assigned',
                  header: 'Assigned',
                  cell: ({ row }) => (
                    <Checkbox
                      aria-label={`Assign ${row.original.name}`}
                      checked={selected.includes(row.original.id)}
                      disabled={row.original.disabled && !selected.includes(row.original.id)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked ? [...selected, row.original.id] : selected.filter((id) => id !== row.original.id),
                        )
                      }
                    />
                  ),
                },
              ]}
            />
            <FieldError errors={[fieldState.error]} />
          </>
        )
      }}
    />
  )
}
