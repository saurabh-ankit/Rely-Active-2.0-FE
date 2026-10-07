import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FeedbackFormsList from './components/FeedbackFormsList'
import FeedbackPermission from './components/FeedbackPermission'

const FeedbackPage = () => {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-start gap-3">
          <Button variant="ghost" size="sm" aria-label="Back to Settings" onClick={() => navigate('/admin/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Feedback</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Create feedback forms and send them to residents, employees or both
            </p>
          </div>
        </div>
        <FeedbackPermission action="create">
          <Button
            onClick={() => navigate('/admin/settings/feedback/forms/create')}
            size="sm"
            className="bg-[#2a517c] hover:bg-[#476587] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Form
          </Button>
        </FeedbackPermission>
      </div>

      <FeedbackFormsList />
    </div>
  )
}

export default FeedbackPage
