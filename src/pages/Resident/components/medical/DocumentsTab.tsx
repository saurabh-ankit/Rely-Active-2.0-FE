import React, { useState } from 'react'
import { Eye, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { useResidentDocumentsQuery } from '@/hooks/react-query/resident'
import { formatDisplayDate } from '@/lib/utils'
import { ClinicalCard, ClinicalErrorBanner, ClinicalTable } from './ClinicalShared'
import AddDocumentModal from './AddDocumentModal'
import FilePreviewModal from './FilePreviewModal'

interface DocumentsTabProps {
  residentId: string
  canUpdateResident: boolean
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ residentId, canUpdateResident }) => {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null)
  const documentsQuery = useResidentDocumentsQuery(residentId)
  const documents = documentsQuery.data ?? []
  const isLoading = documentsQuery.isLoading

  return (
    <>
      {documentsQuery.isError && <ClinicalErrorBanner message="Failed to load documents for this resident." />}
      <ClinicalCard
        icon={FileText}
        iconClassName="text-[#005390]"
        title="Documents"
        count={isLoading ? undefined : documents.length}
        action={
          canUpdateResident ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddOpen(true)}
              className="rounded-xl"
            >
              Add Documents
            </Button>
          ) : undefined
        }
      >
        <ClinicalTable
          columns={[
            { label: 'Name', className: 'w-[30%]' },
            { label: 'Note', className: 'w-[35%]' },
            { label: 'Uploaded On', className: 'w-[20%]' },
            { label: 'File', className: 'w-[15%]' },
          ]}
          isLoading={isLoading}
          loadingLabel="Loading documents..."
          isEmpty={documents.length === 0}
          empty={{ icon: FileText, title: 'No documents', description: 'Uploaded resident documents appear here.' }}
        >
          {documents.map((doc) => (
            <TableRow key={doc.id} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <TableCell className="px-4 py-3.5">
                <div className="font-semibold text-gray-900 dark:text-white">{doc.name}</div>
                {doc.fileName && <div className="text-[11px] text-gray-400 break-all">{doc.fileName}</div>}
              </TableCell>
              <TableCell className="px-4 py-3.5 whitespace-pre-wrap break-words">{doc.note || '-'}</TableCell>
              <TableCell className="px-4 py-3.5 whitespace-nowrap">{formatDisplayDate(doc.createdAt)}</TableCell>
              <TableCell className="px-4 py-3.5">
                <Button
                  variant="link"
                  onClick={() =>
                    setPreview({
                      url: doc.fileUrl,
                      title: doc.name || 'Document',
                    })
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005390] "
                >
                  <Eye className="size-3.5" /> View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </ClinicalTable>
      </ClinicalCard>

      {isAddOpen && <AddDocumentModal open={isAddOpen} onOpenChange={setIsAddOpen} residentId={residentId} />}

      <FilePreviewModal
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
        url={preview?.url ?? null}
        title={preview?.title}
      />
    </>
  )
}

export default DocumentsTab
