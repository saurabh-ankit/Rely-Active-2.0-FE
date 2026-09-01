import { useState } from 'react'
import { Stethoscope, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useMedicalStore } from '@/lib/stores/medicalStore'
import { toast } from 'sonner'

export function MedicalSpecializationsTab() {
  const { specializations, staffList, addSpecialization, removeSpecialization } = useMedicalStore()

  // New Specialization Form
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'DOCTOR' | 'NURSE' | 'ALL'>('DOCTOR')
  const [description, setDescription] = useState('')

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Please enter a specialization name')
      return
    }
    const code = name.trim().toUpperCase().replace(/\s+/g, '_')
    addSpecialization({
      name: name.trim(),
      code,
      category,
      description: description.trim() || undefined,
    })
    toast.success(`Medical Specialization "${name}" added successfully!`)
    setName('')
    setDescription('')
  }

  // Count staff by category
  const doctorCount = staffList.filter((s) => s.role === 'DOCTOR').length
  const nurseCount = staffList.filter((s) => s.role === 'NURSE').length
  const caretakerCount = staffList.filter((s) => s.role === 'CARETAKER').length

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="rounded-3xl border border-white/60 bg-gradient-to-r from-blue-50/80 via-white/80 to-indigo-50/80 p-6 shadow-lg backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#005390] text-white shadow-md">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Medical Specializations & Clinical Focus</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Master taxonomy for doctor specializations, nursing qualifications, and clinical staff duty roles across facility locations.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-3">
          <div className="bg-white/80 border border-blue-100 px-3.5 py-2 rounded-2xl text-center shadow-2xs">
            <span className="block text-xs text-gray-500 font-medium">Specializations</span>
            <span className="text-base font-bold text-[#005390]">{specializations.length}</span>
          </div>
          <div className="bg-white/80 border border-blue-100 px-3.5 py-2 rounded-2xl text-center shadow-2xs">
            <span className="block text-xs text-gray-500 font-medium">Doctors</span>
            <span className="text-base font-bold text-emerald-600">{doctorCount}</span>
          </div>
          <div className="bg-white/80 border border-blue-100 px-3.5 py-2 rounded-2xl text-center shadow-2xs">
            <span className="block text-xs text-gray-500 font-medium">Nurses & Staff</span>
            <span className="text-base font-bold text-purple-600">{nurseCount + caretakerCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-1 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Plus className="w-4 h-4 text-[#005390]" />
            Add New Medical Specialization
          </h2>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Specialization Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cardiology, Geriatrics, ICU Nursing"
                className="mt-1 text-xs bg-white"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Clinical Role Scope *</Label>
              <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                <SelectTrigger className="mt-1 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Doctors & Consultants</SelectItem>
                  <SelectItem value="NURSE">Nursing & Palliative Staff</SelectItem>
                  <SelectItem value="ALL">All Clinical Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Description (Optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Cardiovascular consultations & OPD sessions"
                className="mt-1 text-xs bg-white"
              />
            </div>

            <Button onClick={handleAdd} className="w-full bg-[#005390] hover:bg-[#003865] text-xs gap-1.5 shadow-md">
              <Plus className="w-4 h-4" /> Save Specialization to Registry
            </Button>
          </div>
        </div>

        {/* Master Registry Table / Grid */}
        <div className="lg:col-span-2 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#005390]" />
              Active Medical Specializations Master ({specializations.length})
            </h2>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-[#005390] border-blue-200">
              Facility Registry
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
            {specializations.map((spec) => {
              const assignedStaff = staffList.filter((s) => s.specialization === spec.name)
              return (
                <div
                  key={spec.id}
                  className="p-4 border border-gray-200/80 rounded-2xl bg-white hover:border-[#005390]/40 hover:shadow-md transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{spec.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 ${
                            spec.category === 'DOCTOR'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : spec.category === 'NURSE'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {spec.category}
                        </Badge>
                      </div>
                      {spec.description && <p className="text-xs text-gray-500 mt-1">{spec.description}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        removeSpecialization(spec.id)
                        toast.success(`Specialization "${spec.name}" removed.`)
                      }}
                      className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                      title="Remove Specialization"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1 font-medium text-gray-600">
                      <Users className="w-3.5 h-3.5 text-[#005390]" />
                      Assigned Staff: <strong className="text-gray-900">{assignedStaff.length}</strong>
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">CODE: {spec.code}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
