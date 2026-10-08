import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import FeedbackFormsList from './components/FeedbackFormsList'
import FeedbackPermission from './components/FeedbackPermission'

const FeedbackPage = () => {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Feedback"
        description="Create feedback forms and send them to residents, employees or both."
        onBack={() => navigate('/admin/settings')}
        actions={
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
        }
      />

      <FeedbackFormsList />
    </div>
  )
}

export default FeedbackPage
