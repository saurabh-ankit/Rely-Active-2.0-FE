import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ExternalLink, FileText, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  useActiveLabTestSettingsQuery,
  useCreateResidentLabReportMutation,
  useUpdateResidentLabReportMutation,
} from '@/hooks/react-query/resident'
import type { LabPaymentMethod } from '@/lib/types/medical'
import type { LabReportSeverity, ResidentLabReportItem } from '@/lib/types/resident'
import { getFileUrl } from '@/lib/utils'
import { LAB_REPORT_SEVERITY_LABELS, PAYMENT_METHOD_LABELS } from './clinicalConstants'
import { isValidDateInput, toDateInputValue, todayDateInputValue } from './clinicalFormUtils'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const NO_PAYMENT_METHOD = 'none'

const SEVERITIES = Object.keys(LAB_REPORT_SEVERITY_LABELS) as LabReportSeverity[]
const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as LabPaymentMethod[]

const labReportSchema = z
  .object({
    labTestSettingId: z.string().min(1, 'Select a lab test'),
    severity: z.enum(SEVERITIES as [LabReportSeverity, ...LabReportSeverity[]], { message: 'Select a severity' }),
    reportDate: z
      .string()
      .min(1, 'Report date is required')
      .refine((v) => isValidDateInput(v), 'Enter a valid report date')
      .refine((v) => v <= todayDateInputValue(), 'Report date cannot be in the future'),
    cost: z
      .string()
      .trim()
      .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), 'Enter a valid cost'),
    isPaid: z.boolean(),
    paymentMethod: z.string(),
    notes: z.string().trim().max(5000, 'Notes must be 5000 characters or fewer'),
  })
  .superRefine((values, ctx) => {
    if (values.isPaid && (!values.paymentMethod || values.paymentMethod === NO_PAYMENT_METHOD)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a payment method',
        path: ['paymentMethod'],
      })
    }
  })

type LabReportFormValues = z.infer<typeof labReportSchema>

const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const defaultIsPaid = (item?: ResidentLabReportItem | null) =>
  !!item && (item.isPaid || !!item.paymentMethod || !!item.receiptFileUrl)

interface FilePickerFieldProps {
  id: string
  label: string
  required?: boolean
  file: File | null
  existingUrl?: string | null
  disabled?: boolean
  error?: string | null
  onSelect: (file: File) => void
  onClear: () => void
}

const FilePickerField = ({
  id,
  label,
  required,
  file,
  existingUrl,
  disabled,
  error,
  onSelect,
  onClear,
}: FilePickerFieldProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {file || existingUrl ? (
        <div className="flex items-center gap-3 rounded-xl border bg-gray-50 p-3 dark:bg-slate-800/40">
          <FileText className="h-7 w-7 shrink-0 text-[#005390]" />
          <div className="min-w-0 flex-1">
            {file ? (
              <>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </>
            ) : (
              <a
                href={getFileUrl(existingUrl!)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#005390] hover:underline"
              >
                <ExternalLink className="size-3.5" /> View current file
              </a>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Replace
          </Button>
          {(file || !required) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Remove ${label.toLowerCase()}`}
              onClick={() => {
                if (inputRef.current) inputRef.current.value = ''
                onClear()
              }}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition-colors hover:border-[#005390] hover:text-[#005390]"
        >
          <Upload className="h-5 w-5" />
          <span className="text-sm font-medium">Click to upload</span>
          <span className="text-xs">PDF, JPEG, PNG or WebP, up to 10 MB</span>
        </button>
      )}
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0]
          if (selected) onSelect(selected)
        }}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const validateFile = (file: File): string | null => {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) return 'File must be a PDF or image (JPEG, PNG, WebP)'
  if (file.size > MAX_FILE_BYTES) return 'File must be 10 MB or smaller'
  return null
}

interface LabReportFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  item?: ResidentLabReportItem | null
}

const LabReportFormModal = ({ open, onOpenChange, residentId, item }: LabReportFormModalProps) => {
  const labTestsQuery = useActiveLabTestSettingsQuery(open)
  const createMutation = useCreateResidentLabReportMutation(residentId)
  const updateMutation = useUpdateResidentLabReportMutation(residentId)
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = !!item

  const [reportFile, setReportFile] = useState<File | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [removeReceipt, setRemoveReceipt] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LabReportFormValues>({
    resolver: zodResolver(labReportSchema),
    defaultValues: {
      labTestSettingId: item?.labTestSettingId ?? '',
      severity: item?.severity ?? 'normal',
      reportDate: toDateInputValue(item?.reportDate),
      cost: item?.cost != null ? String(item.cost) : '',
      isPaid: defaultIsPaid(item),
      paymentMethod: item?.paymentMethod ?? NO_PAYMENT_METHOD,
      notes: item?.notes ?? '',
    },
  })

  const isPaid = useWatch({ control, name: 'isPaid' })
  const labTests = labTestsQuery.data ?? []
  const showCurrentOption = !!item && !labTests.some((t) => t.id === item.labTestSettingId)

  const pickFile = (file: File, setFile: (f: File) => void, setError: (e: string | null) => void) => {
    const error = validateFile(file)
    setError(error)
    if (!error) setFile(file)
  }

  const handleAlreadyPaidChange = (checked: boolean) => {
    setValue('isPaid', checked, { shouldValidate: true })
    if (!checked) {
      setValue('paymentMethod', NO_PAYMENT_METHOD, { shouldValidate: true })
      setReceiptFile(null)
      setReceiptError(null)
      if (item?.receiptFileUrl) setRemoveReceipt(true)
    } else {
      setRemoveReceipt(false)
    }
  }

  const onSubmit = (values: LabReportFormValues) => {
    if (!isEdit && !reportFile) {
      setReportError('Please upload the lab report')
      return
    }

    if (values.isPaid) {
      const hasReceipt = !!receiptFile || (!!item?.receiptFileUrl && !removeReceipt)
      if (!hasReceipt) {
        setReceiptError('Please upload the receipt')
        return
      }
    }

    const formData = new FormData()
    formData.append('labTestSettingId', values.labTestSettingId)
    formData.append('severity', values.severity)
    formData.append('reportDate', values.reportDate)
    formData.append('cost', values.cost)
    formData.append('isPaid', values.isPaid ? 'true' : 'false')
    formData.append(
      'paymentMethod',
      values.isPaid && values.paymentMethod !== NO_PAYMENT_METHOD ? values.paymentMethod : '',
    )
    formData.append('notes', values.notes)
    if (reportFile) formData.append('report', reportFile)
    if (values.isPaid && receiptFile) formData.append('receipt', receiptFile)
    if (isEdit && (!values.isPaid || removeReceipt) && !receiptFile) {
      formData.append('removeReceipt', 'true')
    }

    const onSuccess = () => onOpenChange(false)
    if (item) updateMutation.mutate({ id: item.id, payload: formData }, { onSuccess })
    else createMutation.mutate(formData, { onSuccess })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lab Report' : 'Add Lab Report'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this lab report.' : "Upload a lab report to this resident's medical records."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Lab Test <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="labTestSettingId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={labTestsQuery.isLoading ? 'Loading lab tests...' : 'Select lab test'} />
                    </SelectTrigger>
                    <SelectContent>
                      {showCurrentOption && item && (
                        <SelectItem value={item.labTestSettingId}>{item.labTestName || 'Current lab test'}</SelectItem>
                      )}
                      {labTests.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.labTestSettingId && <p className="text-xs text-red-500">{errors.labTestSettingId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                Severity <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="severity"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => value && field.onChange(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {LAB_REPORT_SEVERITY_LABELS[severity]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.severity && <p className="text-xs text-red-500">{errors.severity.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab-report-date">
                Report Date <span className="text-red-500">*</span>
              </Label>
              <Input id="lab-report-date" type="date" max={todayDateInputValue()} {...register('reportDate')} />
              {errors.reportDate && <p className="text-xs text-red-500">{errors.reportDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab-report-cost">Cost (₹)</Label>
              <Input id="lab-report-cost" type="number" min={0} step="0.01" placeholder="0.00" {...register('cost')} />
              {errors.cost && <p className="text-xs text-red-500">{errors.cost.message}</p>}
            </div>
          </div>

          <FilePickerField
            id="lab-report-file"
            label="Lab Report"
            required
            file={reportFile}
            existingUrl={item?.reportFileUrl}
            disabled={isPending}
            error={reportError}
            onSelect={(file) => pickFile(file, setReportFile, setReportError)}
            onClear={() => setReportFile(null)}
          />

          <div className="flex items-center gap-3 text-sm">
            <Controller
              name="isPaid"
              control={control}
              render={({ field }) => (
                <Switch
                  id="lab-report-is-paid"
                  checked={field.value}
                  onCheckedChange={handleAlreadyPaidChange}
                  disabled={isPending}
                />
              )}
            />
            <Label htmlFor="lab-report-is-paid" className="font-medium text-gray-800 dark:text-gray-200">
              Already Paid
            </Label>
          </div>

          {isPaid && (
            <>
              <div className="space-y-2">
                <Label>
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value === NO_PAYMENT_METHOD ? undefined : field.value}
                      onValueChange={(value) => field.onChange(value ?? NO_PAYMENT_METHOD)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.paymentMethod && <p className="text-xs text-red-500">{errors.paymentMethod.message}</p>}
              </div>

              <FilePickerField
                id="lab-receipt-file"
                label="Receipt"
                required
                file={receiptFile}
                existingUrl={removeReceipt ? null : item?.receiptFileUrl}
                disabled={isPending}
                error={receiptError}
                onSelect={(file) => {
                  pickFile(file, setReceiptFile, setReceiptError)
                  setRemoveReceipt(false)
                }}
                onClear={() => {
                  if (receiptFile) setReceiptFile(null)
                  else setRemoveReceipt(true)
                  setReceiptError(null)
                }}
              />
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="lab-report-notes">Notes</Label>
            <Textarea id="lab-report-notes" rows={3} placeholder="Add notes (optional)" {...register('notes')} />
            {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#005390] hover:bg-[#004a80] text-white">
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default LabReportFormModal
