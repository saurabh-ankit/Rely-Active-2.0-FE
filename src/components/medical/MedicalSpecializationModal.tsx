import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Stethoscope, Trash2, UserPlus, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useMedicalStore } from '@/lib/stores/medicalStore'
import { toast } from 'sonner'

interface MedicalSpecializationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MedicalSpecializationModal({ open, onOpenChange }: MedicalSpecializationModalProps) {
  const navigate = useNavigate()
  const { specializations, addSpecialization, removeSpecialization } = useMedicalStore()

  // New Specialization Form
  const [newSpecName, setNewSpecName] = useState('')
  const [newSpecCategory, setNewSpecCategory] = useState<'DOCTOR' | 'NURSE' | 'ALL'>('DOCTOR')
  const [newSpecDesc, setNewSpecDesc] = useState('')

  const handleCreateSpecialization = () => {
    if (!newSpecName.trim()) {
      toast.error('Please enter a specialization name')
      return
    }
    const code = newSpecName.trim().toUpperCase().replace(/\s+/g, '_')
    addSpecialization({
      name: newSpecName.trim(),
      code,
      category: newSpecCategory,
      description: newSpecDesc.trim() || undefined,
    })
    toast.success(`Specialization "${newSpecName}" created successfully!`)
    setNewSpecName('')
    setNewSpecDesc('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Stethoscope className="w-5 h-5 text-[#004B87]" /> Medical Specialization Taxonomy
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-gray-500">
            Define & manage medical specializations available for doctor profiles, nursing roles, and shift roster assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Create New Specialization Form */}
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-[#004B87] flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add New Specialization
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Specialization Name *</Label>
                <Input
                  value={newSpecName}
                  onChange={(e) => setNewSpecName(e.target.value)}
                  placeholder="e.g. Cardiology, Geriatrics, ICU Nursing"
                  className="mt-1 text-xs bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Applies To *</Label>
                <Select value={newSpecCategory} onValueChange={(val: any) => setNewSpecCategory(val)}>
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCTOR">Doctors & Consultants</SelectItem>
                    <SelectItem value="NURSE">Nursing & Palliative Staff</SelectItem>
                    <SelectItem value="ALL">All Clinical Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Description (Optional)</Label>
              <Input
                value={newSpecDesc}
                onChange={(e) => setNewSpecDesc(e.target.value)}
                placeholder="e.g. Primary cardiovascular care & OPD sessions"
                className="mt-1 text-xs bg-white"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreateSpecialization} className="bg-[#004B87] hover:bg-[#003865] text-xs gap-1 shadow-xs">
                <Plus className="w-3.5 h-3.5" /> Save Specialization
              </Button>
            </div>
          </div>

          {/* List Existing Specializations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-700">Active Specializations Registry ({specializations.length})</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  navigate('/admin/employees/create')
                }}
                className="text-xs text-[#004B87] hover:bg-blue-50 gap-1 h-7 px-2"
              >
                <UserPlus className="w-3.5 h-3.5" /> Onboard Employee Section <ExternalLink className="w-3 h-3" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {specializations.map((spec) => (
                <div key={spec.id} className="p-3 border border-gray-200 rounded-xl flex items-center justify-between bg-white hover:border-gray-300">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{spec.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 text-[#004B87]">
                        {spec.category}
                      </Badge>
                    </div>
                    {spec.description && <p className="text-[10px] text-gray-500 mt-0.5">{spec.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeSpecialization(spec.id)
                      toast.success(`Removed specialization ${spec.name}`)
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              navigate('/admin/employees/create')
            }}
            className="text-xs text-[#004B87] border-blue-200 bg-blue-50/50 gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Go to Onboard Employee Section
          </Button>

          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
