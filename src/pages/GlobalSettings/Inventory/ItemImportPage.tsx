import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { useInventoryDetail, useImportInventoryItems } from '@/hooks/react-query/inventory'
import { downloadInventoryTemplate } from '@/lib/services/inventoryService'
import { InventoryPage, FormSection, InventoryLoading, InventoryLoadError } from './PageLayout'
import { categoryPath, useInventoryNavigation } from './navigation'

export function ItemImportPage() {
  const { categoryId = '' } = useParams()
  const category = useInventoryDetail('categories', categoryId)
  const { back } = useInventoryNavigation(categoryPath(categoryId))
  const [rowCount, setRowCount] = useState('10')
  const [file, setFile] = useState<File>()
  const [errors, setErrors] = useState<string[]>([])
  const upload = useImportInventoryItems(categoryId)
  const download = useMutation({ mutationFn: (count: number) => downloadInventoryTemplate(categoryId, count) })
  const pending = download.isPending || upload.isPending
  if (category.isPending) return <InventoryLoading />
  if (category.isError) return <InventoryLoadError retry={() => void category.refetch()} />
  return (
    <InventoryPage
      title="Import Inventory Items"
      description={category.data.name}
      onBack={() => {
        if (!pending) back()
      }}
    >
      <fieldset disabled={pending || !category.data.isActive} className="flex min-w-0 flex-col gap-6">
        <FormSection
          title="Download Template"
          description="Choose 1–500 rows. The template includes current category fields, locations, suppliers, and package options."
        >
          <div className="flex flex-col items-start gap-4">
            <Field>
              <FieldLabel htmlFor="import-row-count">Number of item rows</FieldLabel>
              <Input
                id="import-row-count"
                type="number"
                min={1}
                max={500}
                step={1}
                value={rowCount}
                onChange={(e) => setRowCount(e.target.value)}
              />
            </Field>
            <Button
              variant="outline"
              onClick={async () => {
                const count = Number(rowCount)
                if (!Number.isInteger(count) || count < 1 || count > 500) {
                  setErrors(['Enter a row count between 1 and 500'])
                  return
                }
                try {
                  setErrors([])
                  const blob = await download.mutateAsync(count)
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = 'inventory-items.xlsx'
                  link.click()
                  URL.revokeObjectURL(url)
                } catch {
                  setErrors(['Unable to download the template. Try again.'])
                }
              }}
            >
              {download.isPending ? 'Downloading…' : 'Download Excel Template'}
            </Button>
          </div>
        </FormSection>
        <FormSection
          title="Upload Completed Template"
          description="Select an .xlsx file up to 10 MB. All rows must pass validation before any items are saved."
        >
          <div className="flex flex-col items-start gap-4">
            <Field>
              <FieldLabel htmlFor="inventory-import-file">Excel file</FieldLabel>
              <Input
                id="inventory-import-file"
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  setFile(e.target.files?.[0])
                  setErrors([])
                }}
              />
            </Field>
            <Button
              onClick={async () => {
                if (!file || !file.name.toLowerCase().endsWith('.xlsx') || file.size > 10 * 1024 * 1024 || !file.size) {
                  setErrors(['Choose an .xlsx file up to 10 MB'])
                  return
                }
                try {
                  setErrors([])
                  await upload.mutateAsync(file)
                  toast.success('Inventory items imported')
                  back()
                } catch (error) {
                  const data: unknown = isAxiosError(error) ? error.response?.data : undefined
                  const payload = data as { errors?: unknown; message?: string } | undefined
                  setErrors(
                    Array.isArray(payload?.errors) && payload.errors.every((x) => typeof x === 'string')
                      ? payload.errors
                      : [payload?.message ?? 'Unable to import items. Try again.'],
                  )
                }
              }}
            >
              {upload.isPending ? 'Importing…' : 'Import Items'}
            </Button>
          </div>
        </FormSection>
      </fieldset>
      {errors.length > 0 && (
        <div role="alert" className="text-sm text-destructive">
          <ul className="list-disc pl-5">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <Button variant="outline" disabled={pending} onClick={back}>
        Cancel
      </Button>
    </InventoryPage>
  )
}
