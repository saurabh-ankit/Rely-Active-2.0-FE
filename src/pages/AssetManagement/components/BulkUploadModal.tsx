import React, { useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useGenerateBulkAssetTemplate,
  useGetAssetCategories,
  useGetAssetItemsDropdown,
  useGetAssetVendorsDropdown,
  useUploadBulkAssets,
} from '@/hooks/react-query/assetManagement'
import { useLocationStore } from '@/lib/stores/locationStore'

interface BulkUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ open, onOpenChange }) => {
  const { selectedLocationId } = useLocationStore()
  const [step, setStep] = useState<'configure' | 'upload'>('configure')
  const [categoryId, setCategoryId] = useState('')
  const [itemId, setItemId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [numberOfRecords, setNumberOfRecords] = useState('10')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [templateConfig, setTemplateConfig] = useState<{
    categoryId: string
    itemId: string
    vendorId: string
    locationId: string
    numberOfRecords: number
    templateFileName?: string
  } | null>(null)

  const { data: categoriesData } = useGetAssetCategories({ limit: 1000 })
  const { data: itemsData } = useGetAssetItemsDropdown({
    categoryId,
    enabled: !!categoryId,
  })
  const { data: vendorsData } = useGetAssetVendorsDropdown({
    categoryId,
    enabled: !!categoryId,
  })

  const generateTemplateMutation = useGenerateBulkAssetTemplate()
  const uploadAssetsMutation = useUploadBulkAssets()

  const categories = categoriesData?.data?.categories || []
  const items = itemsData?.data || []
  const vendors = vendorsData?.data || []

  const handleGenerateTemplate = async () => {
    if (!categoryId || !itemId || !numberOfRecords) {
      toast.error('Please fill in all required fields')
      return
    }

    const records = parseInt(numberOfRecords)
    if (isNaN(records) || records < 1 || records > 1000) {
      toast.error('Number of records must be between 1 and 1000')
      return
    }

    try {
      const blob = await generateTemplateMutation.mutateAsync({
        categoryId,
        itemId,
        vendorId,
        numberOfRecords: records,
      })

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await blob.arrayBuffer())

      const worksheet = workbook.getWorksheet(1) || workbook.addWorksheet('Sheet1')

      const headerRow = worksheet.getRow(1)
      const idColumnIndices: number[] = []
      const editableColumnIndices: number[] = []

      headerRow.eachCell((cell, colNumber) => {
        const cellValue = cell.value?.toString().toLowerCase() || ''
        if (
          cellValue.includes('categoryid') ||
          cellValue.includes('locationid') ||
          cellValue.includes('itemid') ||
          cellValue.includes('vendorid') ||
          cellValue.includes('(auto)')
        ) {
          idColumnIndices.push(colNumber)
        } else {
          editableColumnIndices.push(colNumber)
        }
      })

      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (!cell.protection) {
            cell.protection = {}
          }
          cell.protection.locked = true
        })
      })

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (rowNumber === 1) {
            if (!cell.protection) {
              cell.protection = {}
            }
            cell.protection.locked = false
          } else if (!idColumnIndices.includes(colNumber)) {
            if (!cell.protection) {
              cell.protection = {}
            }
            cell.protection.locked = false
          }
        })
      })

      idColumnIndices.forEach((colNum) => {
        const column = worksheet.getColumn(colNum)
        column.protection = { locked: true }
      })

      const protectionPassword = 'RELY_ASSIST_PROTECTED'
      worksheet.protect(protectionPassword, {
        selectLockedCells: false,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        insertHyperlinks: false,
        deleteColumns: false,
        deleteRows: false,
        sort: false,
        autoFilter: false,
        pivotTables: false,
      })

      let dataStartRow = 2
      const row2 = worksheet.getRow(2)
      let isPlaceholderRow = false
      row2.eachCell((cell) => {
        const cellValue = cell.value?.toString().toLowerCase() || ''
        if (
          cellValue.includes('enter') ||
          cellValue.includes('yyyy-mm-dd') ||
          cellValue.includes('excellent') ||
          cellValue.includes('optional')
        ) {
          isPlaceholderRow = true
        }
      })

      dataStartRow = isPlaceholderRow ? 3 : 2
      const maxAllowedDataRow = dataStartRow + records - 1

      const totalRows = worksheet.rowCount
      if (totalRows > maxAllowedDataRow) {
        const rowsToDelete = totalRows - maxAllowedDataRow
        for (let i = 0; i < rowsToDelete; i++) {
          worksheet.spliceRows(maxAllowedDataRow + 1, 1)
        }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const protectedBlob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const templateFileName = `bulk_assets_template_${Date.now()}.xlsx`

      const url = window.URL.createObjectURL(protectedBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = templateFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setTemplateConfig({
        categoryId,
        itemId,
        vendorId,
        locationId: selectedLocationId || '',
        numberOfRecords: records,
        templateFileName,
      })

      toast.success('Template downloaded successfully with protection enabled!')
      setStep('upload')
    } catch (error) {
      console.error('Error generating template:', error)
    }
  }

  const validateUploadedFile = async (
    file: File,
  ): Promise<{
    isValid: boolean
    errors: string[]
  }> => {
    const errors: string[] = []

    if (!templateConfig) {
      errors.push('Template configuration not found. Please download the template again.')
      return { isValid: false, errors }
    }

    if (templateConfig.templateFileName && file.name !== templateConfig.templateFileName) {
      errors.push(
        `❌ File name mismatch! The file has been renamed or is a different template file.\n\n` +
          `Expected filename: "${templateConfig.templateFileName}"\n` +
          `Uploaded filename: "${file.name}"\n\n` +
          `⚠️ IMPORTANT: Do not rename the template file. Please upload the file with its original name: "${templateConfig.templateFileName}"`,
      )
    }

    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.getWorksheet(1)

      if (!worksheet) {
        errors.push('Worksheet not found in the file.')
        return { isValid: false, errors }
      }

      const headerRow = worksheet.getRow(1)
      const columnMap: Record<string, number> = {}

      headerRow.eachCell((cell, colNumber) => {
        const cellValue = cell.value?.toString().toLowerCase() || ''
        if (cellValue.includes('categoryid')) {
          columnMap.categoryId = colNumber
        } else if (cellValue.includes('itemid')) {
          columnMap.itemId = colNumber
        } else if (cellValue.includes('vendorid')) {
          columnMap.vendorId = colNumber
        } else if (cellValue.includes('locationid')) {
          columnMap.locationId = colNumber
        }
      })

      if (!columnMap.categoryId || !columnMap.itemId || !columnMap.vendorId || !columnMap.locationId) {
        errors.push('Required ID columns (categoryId, itemId, vendorId, locationId) not found in the file.')
        return { isValid: false, errors }
      }

      let dataStartRow = 2
      const row2 = worksheet.getRow(2)
      let isPlaceholderRow = false
      row2.eachCell((cell) => {
        const cellValue = cell.value?.toString().toLowerCase() || ''
        if (
          cellValue.includes('enter') ||
          cellValue.includes('yyyy-mm-dd') ||
          cellValue.includes('excellent') ||
          cellValue.includes('optional')
        ) {
          isPlaceholderRow = true
        }
      })
      dataStartRow = isPlaceholderRow ? 3 : 2

      const firstDataRow = worksheet.getRow(dataStartRow)
      const fileCategoryId = firstDataRow.getCell(columnMap.categoryId).value?.toString() || ''
      const fileItemId = firstDataRow.getCell(columnMap.itemId).value?.toString() || ''
      const fileVendorId = firstDataRow.getCell(columnMap.vendorId).value?.toString() || ''
      const fileLocationId = firstDataRow.getCell(columnMap.locationId).value?.toString() || ''

      const isDifferentTemplate =
        fileCategoryId !== templateConfig.categoryId ||
        fileItemId !== templateConfig.itemId ||
        fileVendorId !== templateConfig.vendorId ||
        fileLocationId !== templateConfig.locationId

      if (isDifferentTemplate) {
        errors.push(
          '❌ This is a different template file! The uploaded file contains different Category, Item, Vendor, or Location IDs than the template you downloaded.',
        )
      }

      let dataRowCount = 0
      const emptyRows: number[] = []

      for (let i = dataStartRow; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i)
        const categoryIdValue = row.getCell(columnMap.categoryId).value
        const itemIdValue = row.getCell(columnMap.itemId).value

        if (categoryIdValue && itemIdValue) {
          dataRowCount++

          let hasAllRequiredData = true
          const requiredFields: string[] = []

          headerRow.eachCell((cell, colNumber) => {
            const cellValue = cell.value?.toString().toLowerCase() || ''
            if (cellValue.includes('assettag')) {
              const fieldValue = row.getCell(colNumber).value
              if (!fieldValue || fieldValue.toString().trim() === '') {
                hasAllRequiredData = false
                requiredFields.push(cellValue)
              }
            }
          })

          if (!hasAllRequiredData) {
            emptyRows.push(i)
          }
        }
      }

      if (dataRowCount !== templateConfig.numberOfRecords) {
        errors.push(`Row count mismatch. Expected ${templateConfig.numberOfRecords} data rows, found ${dataRowCount}.`)
      }

      if (emptyRows.length > 0) {
        errors.push(
          `Missing required data in ${emptyRows.length} row(s): ${emptyRows.join(', ')}. Please fill all mandatory fields.`,
        )
      }

      const hasFilenameMismatch = templateConfig.templateFileName && file.name !== templateConfig.templateFileName

      return {
        isValid: errors.length === 0 && !hasFilenameMismatch,
        errors,
      }
    } catch (error) {
      console.error('Error validating file:', error)
      errors.push("Failed to read the Excel file. Please ensure it's a valid Excel file.")
      return { isValid: false, errors }
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Please upload an Excel file (.xlsx or .xls)')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      const validation = await validateUploadedFile(file)
      if (!validation.isValid) {
        validation.errors.forEach((error) => {
          toast.error(error)
        })
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      setSelectedFile(file)
      toast.success('File validated successfully!')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    const validation = await validateUploadedFile(selectedFile)
    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        toast.error(error)
      })
      return
    }

    try {
      await uploadAssetsMutation.mutateAsync(selectedFile)
      handleClose(true)
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const handleClose = (forceClose = false) => {
    if (!forceClose && step === 'upload') {
      return
    }
    setStep('configure')
    setCategoryId('')
    setItemId('')
    setVendorId('')
    setNumberOfRecords('10')
    setSelectedFile(null)
    setTemplateConfig(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (step === 'upload') {
        return
      }
      handleClose(true)
    } else {
      onOpenChange(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === 'configure' ? 'Configure Bulk Asset Upload' : 'Upload Filled Template'}</DialogTitle>
          <DialogDescription>
            {step === 'configure'
              ? 'Select the asset details and download the template to fill'
              : 'Upload the filled template to import assets'}
          </DialogDescription>
        </DialogHeader>

        {step === 'configure' ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select category and item, then specify how many assets you want to add. We'll generate a template with
                pre-filled information.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item">
                  Item <span className="text-red-500">*</span>
                </Label>
                <Select value={itemId} onValueChange={setItemId} disabled={!categoryId}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!categoryId && <p className="text-xs text-gray-500 mt-1">Select a category first</p>}
              </div>

              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId} disabled={!categoryId}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!categoryId && <p className="text-xs text-gray-500 mt-1">Select a category first</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="numberOfRecords">
                Number of Assets <span className="text-red-500">*</span>
              </Label>
              <Input
                id="numberOfRecords"
                type="number"
                min="1"
                max="1000"
                value={numberOfRecords}
                onChange={(e) => setNumberOfRecords(e.target.value)}
                placeholder="Enter number of assets (1-1000)"
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 1000 assets per upload</p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Template will include:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Pre-filled category and item (and vendor if selected) information</li>
                  <li>Fields to fill: Serial Number, Asset Tag, Purchase Date, Purchase Price, Condition</li>
                  <li>Data validation and instructions for each field</li>
                  <li>
                    <strong>Protected:</strong> ID columns (categoryId, locationId, itemId, vendorId) are locked and
                    cannot be edited
                  </li>
                  <li>
                    <strong>Row Limit:</strong> Template is limited to {numberOfRecords || 'selected'} rows
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Template downloaded! Fill in the required fields and upload the file below.
              </AlertDescription>
            </Alert>

            {templateConfig?.templateFileName && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>⚠️ Important:</strong> Do not rename the template file. The file must be uploaded with its
                  original name: <code className="bg-yellow-100 px-1 rounded">{templateConfig.templateFileName}</code>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="file-upload">
                Upload Filled Template <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2">
                <Input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>
              {selectedFile && (
                <div className="mt-2">
                  {templateConfig?.templateFileName && selectedFile.name !== templateConfig.templateFileName ? (
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ Warning: File name mismatch! Expected: "{templateConfig.templateFileName}"
                    </p>
                  ) : (
                    <p className="text-sm text-green-600">
                      ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep('configure')} className="flex-1 min-w-[140px]">
                Back to Configure
              </Button>
              <Button
                onClick={handleGenerateTemplate}
                disabled={generateTemplateMutation.isPending}
                variant="outline"
                className="flex-1 min-w-[140px]"
              >
                <Download className="h-4 w-4 mr-2" />
                Re-download Template
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button variant="outline" onClick={() => handleClose(true)} className="w-full sm:w-auto order-2 sm:order-1">
            Cancel
          </Button>
          {step === 'configure' ? (
            <Button
              onClick={handleGenerateTemplate}
              disabled={!categoryId || !itemId || !numberOfRecords || generateTemplateMutation.isPending}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              <Download className="h-4 w-4 mr-2" />
              {generateTemplateMutation.isPending ? 'Generating...' : 'Download Template'}
            </Button>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadAssetsMutation.isPending}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadAssetsMutation.isPending ? 'Uploading...' : 'Upload Assets'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BulkUploadModal
