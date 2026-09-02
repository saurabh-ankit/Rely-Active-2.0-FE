import EventForm from '../EventForm'

interface CreateEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId?: string
}

const CreateEventModal = ({ open, onOpenChange, eventId }: CreateEventModalProps) => {
  return <EventForm asModal open={open} onOpenChange={onOpenChange} eventId={eventId} />
}

export default CreateEventModal
