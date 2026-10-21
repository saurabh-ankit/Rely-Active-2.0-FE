import { Input } from '@/components/ui/input'
import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Edit2,
  Utensils,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Building2,
  Layers,
  Tag,
} from 'lucide-react'
import api from '@/lib/api/axios'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import { useLocationContext } from '@/hooks/useLocation'
import { notifySuccess } from '@/utils/toast'
import { useScrollLock } from '@/hooks/useScrollLock'
import { Label } from '@/components/ui/label'

const DISH_CATEGORIES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'starters', label: 'Starters', icon: '🍢' },
  { key: 'main_course', label: 'Main Course', icon: '🍲' },
  { key: 'breads', label: 'Breads', icon: '🫓' },
  { key: 'rice_biryani', label: 'Rice & Biryani', icon: '🍚' },
  { key: 'snacks_desserts', label: 'Snacks & Desserts', icon: '🍰' },
  { key: 'beverages', label: 'Beverages', icon: '🥤' },
  { key: 'other', label: 'Other', icon: '🍽️' },
]

export interface Property {
  id: string
  name?: string
  propertyName?: string
  property_name?: string
  locationCode?: string
}

export interface PropertyDish {
  id: string
  locId: string
  price: number
  isAvailable: boolean
}

export interface Dish {
  id: string
  name: string
  category: string
  dietaryType: 'veg' | 'non_veg' | 'egg' | 'jain' | 'vegan'
  description?: string
  basePrice: number
  imageUrl?: string
  isActive: boolean
  propertyDishes?: PropertyDish[]
}

export interface FnbDishesMasterTabProps {
  locId?: string
  isLocationMode?: boolean
}

const getCategoryMeta = (catKey: string) => {
  const found = DISH_CATEGORIES.find((c) => c.key === catKey || c.label.toLowerCase() === catKey.toLowerCase())
  return found || { key: catKey, label: catKey, icon: '🍽️' }
}

const getPropName = (p: Property): string => p.property_name || p.propertyName || p.name || 'Unnamed Property'

export function FnbDishesMasterTab({ locId, isLocationMode = false }: FnbDishesMasterTabProps) {
  const { hasResourcePermission } = useLocationContext()
  const canCreateFnb = hasResourcePermission('FNB', 'create')
  const canUpdateFnb = hasResourcePermission('FNB', 'update')
  const [dishes, setDishes] = useState<Dish[]>([])
  const [availableProperties, setAvailableProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Expansion
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL')
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  // Modal State (Master Edit / Create)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [saving, setSaving] = useState(false)

  // Form State (Master)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('main_course')
  const [dietaryType, setDietaryType] = useState<'veg' | 'non_veg' | 'egg' | 'jain' | 'vegan'>('veg')
  const [basePrice, setBasePrice] = useState<number | string>(0)
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  // Price Override Modal State (Location Mode)
  const [overrideModalDish, setOverrideModalDish] = useState<Dish | null>(null)
  const [overridePrice, setOverridePrice] = useState<number | string>(0)
  const [overrideSaving, setOverrideSaving] = useState(false)

  useScrollLock(isModalOpen || !!overrideModalDish)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [dishesRes, propsRes] = await Promise.allSettled([
        api.get('/fnb/dishes/master'),
        getPropertiesAPI().catch(async () => {
          const res = await api.get('/property')
          return res.data?.data || res.data
        }),
      ])

      if (dishesRes.status === 'fulfilled' && dishesRes.value.data?.success) {
        const rawData = dishesRes.value.data.data || []
        const normalized: Dish[] = rawData.map(
          (item: Dish & { dish?: Dish; locId?: string; price?: number; isAvailable?: boolean }) => {
            if (item.dish && typeof item.dish === 'object') {
              const baseDish = item.dish
              const existingPropDishes: PropertyDish[] = Array.isArray(baseDish.propertyDishes)
                ? baseDish.propertyDishes
                : []
              const hasPropDish = existingPropDishes.some((pd: PropertyDish) => pd.locId === item.locId)
              return {
                ...baseDish,
                propertyDishes: hasPropDish
                  ? existingPropDishes
                  : [
                      ...existingPropDishes,
                      {
                        id: item.id,
                        locId: item.locId || '',
                        price: item.price || 0,
                        isAvailable: item.isAvailable ?? true,
                      },
                    ],
              }
            }
            return item
          },
        )
        setDishes(normalized)
      }

      if (propsRes.status === 'fulfilled') {
        const rawProps = propsRes.value
        const propsList = Array.isArray(rawProps) ? rawProps : Array.isArray(rawProps?.data) ? rawProps.data : []
        setAvailableProperties(propsList)
      }
    } catch (err) {
      console.error('Failed to load dish catalogue & properties:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const loadData = async () => {
      if (!ignore) {
        await fetchData()
      }
    }
    void loadData()
    return () => {
      ignore = true
    }
  }, [fetchData])

  const toggleCategoryCollapse = (catKey: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }))
  }

  const handleOpenCreate = () => {
    setEditingDish(null)
    setName('')
    setCategory('main_course')
    setDietaryType('veg')
    setBasePrice(0)
    setDescription('')
    setImageFile(null)
    setImagePreviewUrl('')
    setSelectedPropertyIds(availableProperties.map((p) => p.id))
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (dish: Dish) => {
    if (isLocationMode && locId) {
      // Open Location Price Override modal
      const pd = dish.propertyDishes?.find((p) => p.locId === locId)
      setOverrideModalDish(dish)
      setOverridePrice(pd ? pd.price : dish.basePrice)
      setErrorMsg('')
      return
    }

    // Open full Master Dish edit modal
    setEditingDish(dish)
    setName(dish.name)
    const meta = getCategoryMeta(dish.category)
    setCategory(meta.key)
    setDietaryType(dish.dietaryType)
    setBasePrice(dish.basePrice)
    setDescription(dish.description || '')
    setImageFile(null)
    setImagePreviewUrl(dish.imageUrl || '')

    const assignedIds = dish.propertyDishes
      ? dish.propertyDishes.filter((pd) => pd.isAvailable).map((pd) => pd.locId)
      : []
    setSelectedPropertyIds(assignedIds)
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleSavePriceOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overrideModalDish || !locId) return

    try {
      setOverrideSaving(true)
      setErrorMsg('')

      const res = await api.post('/fnb/property-dishes', {
        locId,
        dishId: overrideModalDish.id,
        price: Number(overridePrice) || 0,
        isAvailable: true,
      })

      if (res.data?.success) {
        notifySuccess('Location dish price updated successfully!')
        setOverrideModalDish(null)
        fetchData()
      } else {
        setErrorMsg(res.data?.message || 'Failed to update price')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setErrorMsg(msg || 'Failed to update price')
    } finally {
      setOverrideSaving(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSelectAllProperties = () => {
    if (selectedPropertyIds.length === availableProperties.length) {
      setSelectedPropertyIds([])
    } else {
      setSelectedPropertyIds(availableProperties.map((p) => p.id))
    }
  }

  const handleToggleProperty = (propId: string) => {
    setSelectedPropertyIds((prev) => (prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Dish name is required.')
      return
    }

    try {
      setSaving(true)
      setErrorMsg('')

      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('category', category)
      formData.append('dietaryType', dietaryType)
      formData.append('basePrice', String(basePrice || 0))
      formData.append('description', description || '')

      if (imageFile) {
        formData.append('image', imageFile)
      } else if (editingDish?.imageUrl) {
        formData.append('imageUrl', editingDish.imageUrl)
      }

      formData.append('propertyIds', JSON.stringify(selectedPropertyIds))

      const res = editingDish
        ? await api.put(`/fnb/dishes/${editingDish.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await api.post('/fnb/dishes', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })

      if (res.data?.success) {
        notifySuccess(`Dish ${editingDish ? 'updated' : 'created'} successfully!`)
        setIsModalOpen(false)
        fetchData()
      } else {
        setErrorMsg(res.data?.message || 'Failed to save dish')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setErrorMsg(msg || 'Server connection error')
    } finally {
      setSaving(false)
    }
  }

  // Filter dishes for Location Mode vs Global Mode
  const displayDishes = dishes.filter((dish) => {
    if (isLocationMode && locId) {
      if (!dish.propertyDishes || dish.propertyDishes.length === 0) {
        return true
      }
      const pd = dish.propertyDishes.find((p) => p.locId === locId && p.isAvailable)
      return !!pd
    }
    return true
  })

  // Categorical Grouping
  const groupedDishes: Record<string, Dish[]> = {}
  displayDishes.forEach((d) => {
    const meta = getCategoryMeta(d.category)
    const key = meta.key
    if (!groupedDishes[key]) groupedDishes[key] = []
    groupedDishes[key].push(d)
  })

  const isAllPropsSelected = availableProperties.length > 0 && selectedPropertyIds.length === availableProperties.length

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#005390]" />{' '}
            {isLocationMode ? 'Dish Catalogue' : 'Master Dish Catalogue'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isLocationMode
              ? 'View dishes assigned to this property location and manage property price overrides.'
              : 'Manage global dish templates, categories, image uploads, and property distribution.'}
          </p>
        </div>

        {/* Hide Add Master Dish button in Location Mode */}
        {!isLocationMode && canCreateFnb && (
          <Button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-[#005390] text-white px-5 py-2.5 h-auto rounded-xl font-bold text-xs hover:bg-[#004070] transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Master Dish
          </Button>
        )}
      </div>

      {/* Category Pills Quick Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveCategoryFilter('ALL')}
          className={`px-3.5 py-1.5 h-auto rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeCategoryFilter === 'ALL'
              ? 'bg-[#005390] text-white shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> All Dishes ({displayDishes.length})
        </Button>
        {DISH_CATEGORIES.map((cat) => {
          const count = groupedDishes[cat.key]?.length || 0
          return (
            <Button
              key={cat.key}
              type="button"
              variant="ghost"
              onClick={() => setActiveCategoryFilter(cat.key)}
              className={`px-3 py-1.5 h-auto rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategoryFilter === cat.key
                  ? 'bg-[#005390] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeCategoryFilter === cat.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {count}
              </span>
            </Button>
          )
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading dish catalogue...</div>
      ) : displayDishes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
          {isLocationMode
            ? 'No dishes assigned to this location yet.'
            : 'No dishes created yet. Click "Add Master Dish" to begin.'}
        </div>
      ) : (
        /* Categorical View Sections */
        <div className="space-y-6">
          {DISH_CATEGORIES.map((cat) => {
            const categoryDishes = groupedDishes[cat.key] || []
            if (activeCategoryFilter !== 'ALL' && activeCategoryFilter !== cat.key) return null
            if (categoryDishes.length === 0 && activeCategoryFilter !== cat.key) return null

            const isCollapsed = collapsedCategories[cat.key]

            return (
              <div key={cat.key} className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                {/* Category Header */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toggleCategoryCollapse(cat.key)}
                  className="w-full h-auto text-left px-5 py-3.5 bg-gray-50/80 border-b border-gray-200/80 flex items-center justify-between cursor-pointer hover:bg-gray-100/50 transition-colors rounded-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{cat.icon}</span>
                    <h3 className="font-bold text-gray-800 text-sm">{cat.label}</h3>
                    <span className="text-xs font-bold text-[#005390] bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                      {categoryDishes.length} {categoryDishes.length === 1 ? 'Dish' : 'Dishes'}
                    </span>
                  </div>
                  <div className="text-gray-400 p-1">
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </Button>

                {/* Category Dishes Table */}
                {!isCollapsed && (
                  <div>
                    {categoryDishes.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs italic">
                        No dishes listed in this category yet.
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <Table className="w-full text-left text-xs text-gray-600 border-collapse">
                          <TableHeader className="bg-gray-50/50 text-gray-400 uppercase tracking-wider font-bold text-[10px] border-b border-gray-100">
                            <TableRow>
                              <TableHead className="px-5 py-3">Dish Name & Description</TableHead>
                              <TableHead className="px-5 py-3">Dietary Type</TableHead>
                              <TableHead className="px-5 py-3">
                                {isLocationMode ? 'Price (in this property)' : 'Base Price'}
                              </TableHead>
                              {!isLocationMode && <TableHead className="px-5 py-3">Assigned Properties</TableHead>}
                              <TableHead className="px-5 py-3 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-gray-100">
                            {categoryDishes.map((dish) => {
                              const pd = locId ? dish.propertyDishes?.find((p) => p.locId === locId) : null
                              const effectivePrice = isLocationMode && pd ? pd.price : dish.basePrice
                              const assignedPropsCount = dish.propertyDishes
                                ? dish.propertyDishes.filter((p) => p.isAvailable).length
                                : 0

                              const isNonVeg = dish.dietaryType === 'non_veg'
                              const isVeg = dish.dietaryType === 'veg'

                              return (
                                <TableRow key={dish.id} className="hover:bg-gray-50/60 transition-colors">
                                  <TableCell className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                      {dish.imageUrl ? (
                                        <img
                                          src={dish.imageUrl}
                                          alt={dish.name}
                                          className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-2xs shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#005390] flex items-center justify-center font-extrabold text-sm border border-blue-100 shrink-0">
                                          {dish.name[0]}
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-bold text-gray-900 text-xs">{dish.name}</div>
                                        {dish.description && (
                                          <div className="text-[11px] text-gray-400 font-normal line-clamp-1 max-w-sm mt-0.5">
                                            {dish.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5">
                                    <span
                                      className={`px-2.5 py-1 rounded-full font-semibold capitalize text-[11px] border inline-block ${
                                        isNonVeg
                                          ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                          : isVeg
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}
                                    >
                                      {dish.dietaryType.replace('_', ' ')}
                                    </span>
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5 font-extrabold text-gray-900 text-xs">
                                    ₹{Number(effectivePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  {!isLocationMode && (
                                    <TableCell className="px-5 py-3.5">
                                      {assignedPropsCount === 0 ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-gray-50 text-gray-400 border border-gray-200 italic">
                                          <Building2 className="w-3 h-3 text-gray-300" /> No Properties
                                        </span>
                                      ) : (
                                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                                          {dish.propertyDishes
                                            ?.filter((p) => p.isAvailable)
                                            .map((p) => {
                                              const prop = availableProperties.find((ap) => ap.id === p.locId)
                                              const propName = prop ? getPropName(prop) : 'Property'
                                              return (
                                                <span
                                                  key={p.id || p.locId}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] bg-blue-50 text-[#005390] border border-blue-100 shadow-2xs"
                                                >
                                                  <Building2 className="w-3 h-3 text-[#005390]" />
                                                  {propName}
                                                </span>
                                              )
                                            })}
                                        </div>
                                      )}
                                    </TableCell>
                                  )}
                                  <TableCell className="px-5 py-3.5 text-right">
                                    {canUpdateFnb && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleOpenEdit(dish)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 h-auto rounded-lg text-xs font-semibold bg-blue-50 text-[#005390] border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        {isLocationMode ? 'Edit Price' : 'Edit'}
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Price Override Modal for Location Mode */}
      <Dialog
        open={Boolean(overrideModalDish && locId)}
        onOpenChange={(open) => {
          if (!open) setOverrideModalDish(null)
        }}
      >
        {overrideModalDish && locId && (
          <DialogContent className="sm:max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3 pr-8">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#005390]" /> Edit Property Price Override
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">{overrideModalDish.name}</DialogDescription>
              </DialogHeader>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSavePriceOverride} className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-gray-700 mb-1">Base Price (Global)</span>
                <div className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-500">
                  ₹{Number(overrideModalDish.basePrice).toFixed(2)}
                </div>
              </div>

              <div>
                <label htmlFor="override-price-input" className="block text-xs font-semibold text-gray-700 mb-1">
                  Location Specific Price (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  id="override-price-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-extrabold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOverrideModalDish(null)}
                  className="px-4 py-2 h-auto text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={overrideSaving}
                  className="px-5 py-2 h-auto bg-[#005390] text-white text-xs font-bold rounded-xl hover:bg-[#004070] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {overrideSaving ? 'Saving...' : 'Update Price'}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* Wider Add / Edit Master Dish Modal (Global Mode) */}
      <Dialog
        open={Boolean(isModalOpen && !isLocationMode)}
        onOpenChange={(open) => {
          if (!open) setIsModalOpen(false)
        }}
      >
        {isModalOpen && !isLocationMode && (
          <DialogContent className="sm:max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="border-b border-gray-100 p-6 pb-4 pr-12">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                    <Utensils className="w-5 h-5" />
                  </div>
                  {editingDish ? 'Edit Master Dish' : 'Add Master Dish'}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-1">
                  Define dish details, category, image upload, and assign target property locations.
                </DialogDescription>
              </DialogHeader>
            </div>

            {errorMsg && (
              <div className="mx-6 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
              </div>
            )}

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto px-6 pb-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Dish Name */}
                <div className="sm:col-span-2">
                  <Label htmlFor="dish-name-input" className="block text-xs font-semibold text-gray-700 mb-1">
                    Dish Name <span className="text-red-500 font-bold ml-0.5">*</span>
                  </Label>
                  <Input
                    id="dish-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Paneer Butter Masala"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                    required
                  />
                </div>

                {/* Category (Enum based) */}
                <div>
                  <Label htmlFor="dish-category-select" className="block text-xs font-semibold text-gray-700 mb-1">
                    Category
                  </Label>
                  <Select value={category} onValueChange={(val) => setCategory(val)}>
                    <SelectTrigger
                      id="dish-category-select"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-white text-gray-800 h-auto"
                    >
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISH_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.key} value={cat.key}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dietary Type */}
                <div>
                  <Label htmlFor="dish-dietary-select" className="block text-xs font-semibold text-gray-700 mb-1">
                    Dietary Type
                  </Label>
                  <Select
                    value={dietaryType}
                    onValueChange={(val) => setDietaryType(val as 'veg' | 'non_veg' | 'egg' | 'jain' | 'vegan')}
                  >
                    <SelectTrigger
                      id="dish-dietary-select"
                      className="w-full px-3.5 py-2.5 text-xs font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390] bg-white text-gray-800 h-auto"
                    >
                      <SelectValue placeholder="Dietary Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">🟢 Vegetarian</SelectItem>
                      <SelectItem value="non_veg">🔴 Non-Vegetarian</SelectItem>
                      <SelectItem value="egg">🟡 Eggitarian</SelectItem>
                      <SelectItem value="jain">🟢 Jain</SelectItem>
                      <SelectItem value="vegan">🌱 Vegan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Base Price */}
                <div>
                  <Label htmlFor="dish-base-price-input" className="block text-xs font-semibold text-gray-700 mb-1">
                    Base Price (₹) for A-La-Carte
                  </Label>
                  <Input
                    id="dish-base-price-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="dish-desc-input" className="block text-xs font-semibold text-gray-700 mb-1">
                    Description / Ingredients
                  </Label>
                  <Input
                    id="dish-desc-input"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Rich tomato gravy, fresh paneer..."
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005390]"
                  />
                </div>

                {/* File Upload for Image (FormData) */}
                <div className="sm:col-span-2">
                  <Label htmlFor="dish-image-input" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Upload Dish Image
                  </Label>
                  <div className="flex items-center gap-4 border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200 shrink-0">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="dish-image-input"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <Label
                        htmlFor="dish-image-input"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#005390]" />
                        {imageFile ? 'Change Uploaded File' : 'Choose Image File'}
                      </Label>
                      <p className="text-[11px] text-gray-400">PNG, JPG, WEBP up to 10MB.</p>
                    </div>
                  </div>
                </div>

                {/* Property Assignment Selector with Select All */}
                <div className="sm:col-span-2 border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                        Assign to Properties ({selectedPropertyIds.length}/{availableProperties.length})
                      </span>
                      <p className="text-[11px] text-gray-500">Select properties where this dish will be available.</p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSelectAllProperties}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005390] hover:text-[#004070] cursor-pointer p-0 h-auto"
                    >
                      {isAllPropsSelected ? (
                        <>
                          <CheckSquare className="w-4 h-4 text-[#005390]" /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 text-gray-400" /> Select All ({availableProperties.length})
                        </>
                      )}
                    </Button>
                  </div>

                  {availableProperties.length === 0 ? (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-400">No properties available.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                      {availableProperties.map((prop) => {
                        const isSelected = selectedPropertyIds.includes(prop.id)
                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            key={prop.id}
                            onClick={() => handleToggleProperty(prop.id)}
                            className={`p-2.5 h-auto rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-200 text-[#005390]'
                                : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
                            }`}
                          >
                            <span className="truncate max-w-[160px]">{getPropName(prop)}</span>
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#005390] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300 shrink-0" />
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 h-auto text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 h-auto bg-[#005390] text-white text-xs font-bold rounded-xl hover:bg-[#004070] transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {saving ? 'Saving Dish...' : 'Save Dish'}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
