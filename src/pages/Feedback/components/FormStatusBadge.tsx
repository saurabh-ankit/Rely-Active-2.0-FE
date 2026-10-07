import { Badge } from '@/components/ui/badge'
import type { FeedbackForm } from '@/lib/types/feedback'

const FormStatusBadge = ({ form }: { form: Pick<FeedbackForm, 'status' | 'isExpired'> }) => {
  if (form.isExpired) return <Badge className="bg-gray-200 text-gray-700">Expired</Badge>
  if (form.status === 'SENT') return <Badge className="bg-green-100 text-green-700">Sent</Badge>
  return <Badge className="bg-amber-100 text-amber-700">Draft</Badge>
}

export default FormStatusBadge
