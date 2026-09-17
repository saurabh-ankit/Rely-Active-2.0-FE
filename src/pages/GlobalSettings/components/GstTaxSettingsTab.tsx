import React, { useState } from 'react'
import { Receipt, CheckCircle2, Save, Building2, Percent } from 'lucide-react'
import { useGetTaxSettings, useUpdateTaxSettings } from '@/hooks/react-query/billing'
import type { TaxSettings } from '@/lib/services/billingService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const GST_PRESETS = [0, 5, 12, 18, 28]

export const GstTaxSettingsTab: React.FC = () => {
  const { data: taxData, isLoading } = useGetTaxSettings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white/60 rounded-3xl border border-white/50 backdrop-blur-xl">
        <div className="flex items-center gap-3 text-sm font-semibold text-gray-500">
          <div className="w-5 h-5 border-2 border-[#005390] border-t-transparent rounded-full animate-spin" />
          Loading Tax & GST Settings...
        </div>
      </div>
    )
  }

  return <GstTaxSettingsForm key={taxData?.data ? 'loaded' : 'empty'} initial={taxData?.data} />
}

const GstTaxSettingsForm: React.FC<{ initial?: TaxSettings }> = ({ initial }) => {
  const updateTaxMutation = useUpdateTaxSettings()

  const [gstEnabled, setGstEnabled] = useState<boolean>(initial?.gstEnabled ?? true)
  const [defaultGstRate, setDefaultGstRate] = useState<number>(Number(initial?.defaultGstRate ?? 18))
  const [cgstRate, setCgstRate] = useState<number>(Number(initial?.cgstRate ?? 9))
  const [sgstRate, setSgstRate] = useState<number>(Number(initial?.sgstRate ?? 9))
  const [companyGstNumber, setCompanyGstNumber] = useState<string>(initial?.companyGstNumber || '')

  const handleTotalRateChange = (val: number) => {
    const rate = Math.max(0, Math.min(100, val))
    setDefaultGstRate(rate)
    const half = Number((rate / 2).toFixed(2))
    setCgstRate(half)
    setSgstRate(half)
  }

  const handlePresetClick = (preset: number) => {
    handleTotalRateChange(preset)
  }

  const handleSave = async () => {
    await updateTaxMutation.mutateAsync({
      gstEnabled,
      defaultGstRate,
      cgstRate,
      sgstRate,
      companyGstNumber: companyGstNumber.trim().toUpperCase(),
    })
  }

  // Simulation preview
  const sampleBase = 1000
  const effectiveRate = gstEnabled ? defaultGstRate : 0
  const sampleTax = Number(((sampleBase * effectiveRate) / 100).toFixed(2))
  const sampleCgst = Number(((sampleBase * (gstEnabled ? cgstRate : 0)) / 100).toFixed(2))
  const sampleSgst = Number(((sampleBase * (gstEnabled ? sgstRate : 0)) / 100).toFixed(2))
  const sampleTotal = sampleBase + sampleTax

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-3xl border border-white/40 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#005390]/10 p-3.5 text-[#005390]">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">GST & Tax Settings</h1>
              <p className="text-xs text-gray-500 mt-1">
                Configure global GST compliance, tax split ratios, and default GSTIN applied to resident billing and
                invoice generation.
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateTaxMutation.isPending}
            className="bg-[#005390] hover:bg-[#003f6e] text-white font-bold px-6 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            {updateTaxMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="rounded-3xl border border-white/40 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-8">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <div className="space-y-0.5">
            <Label className="text-sm font-bold text-gray-900">Enable GST Invoicing</Label>
            <p className="text-xs text-gray-500">
              When enabled, invoices will automatically include GST, CGST, and SGST breakdowns.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={gstEnabled}
            onClick={() => setGstEnabled(!gstEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#005390] focus:ring-offset-2 ${
              gstEnabled ? 'bg-[#005390]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                gstEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Company GSTIN */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#005390]" /> Company GSTIN / Tax ID
          </Label>
          <Input
            type="text"
            placeholder="e.g. 29ABCDE1234F1Z5"
            value={companyGstNumber}
            onChange={(e) => setCompanyGstNumber(e.target.value.toUpperCase())}
            maxLength={15}
            className="rounded-xl border-gray-200 focus:border-[#005390] focus:ring-[#005390] font-mono uppercase text-sm tracking-wider font-semibold"
          />
          <p className="text-[11px] text-gray-400">
            This GST number will be printed on all generated tax invoices and receipts.
          </p>
        </div>

        {/* GST Slab & Breakdown */}
        <div
          className={`space-y-6 transition-opacity duration-200 ${!gstEnabled ? 'opacity-40 pointer-events-none' : ''}`}
        >
          {/* Rate Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-[#005390]" /> Default Total GST Rate (%)
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {GST_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    defaultGstRate === preset
                      ? 'bg-[#005390] text-white border-[#005390] shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {preset}%
                </button>
              ))}
              <div className="flex items-center gap-1 ml-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={defaultGstRate}
                  onChange={(e) => handleTotalRateChange(Number(e.target.value))}
                  className="w-24 rounded-xl border-gray-200 text-sm font-bold text-right pr-2"
                />
                <span className="text-xs font-bold text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* CGST & SGST Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-gray-800">CGST (Central Tax)</Label>
                <span className="text-[11px] font-bold text-[#005390] bg-blue-100/60 px-2 py-0.5 rounded-md">
                  {cgstRate}%
                </span>
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={cgstRate}
                onChange={(e) => setCgstRate(Number(e.target.value))}
                className="rounded-xl bg-white border-blue-200 text-sm font-semibold"
              />
              <p className="text-[11px] text-gray-500">Central Goods and Services Tax proportion</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-gray-800">SGST / UTGST (State Tax)</Label>
                <span className="text-[11px] font-bold text-[#005390] bg-blue-100/60 px-2 py-0.5 rounded-md">
                  {sgstRate}%
                </span>
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={sgstRate}
                onChange={(e) => setSgstRate(Number(e.target.value))}
                className="rounded-xl bg-white border-blue-200 text-sm font-semibold"
              />
              <p className="text-[11px] text-gray-500">State Goods and Services Tax proportion</p>
            </div>
          </div>
        </div>

        {/* Live Calculation Preview Box */}
        <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Live Invoicing Preview (₹1,000 Demo Line Item)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100">
              <span className="text-[10px] text-gray-500 block uppercase font-medium">Subtotal</span>
              <span className="font-bold text-gray-900 text-sm">₹{sampleBase.toFixed(2)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100">
              <span className="text-[10px] text-gray-500 block uppercase font-medium">
                CGST ({gstEnabled ? cgstRate : 0}%)
              </span>
              <span className="font-bold text-emerald-700 text-sm">₹{sampleCgst.toFixed(2)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-100">
              <span className="text-[10px] text-gray-500 block uppercase font-medium">
                SGST ({gstEnabled ? sgstRate : 0}%)
              </span>
              <span className="font-bold text-emerald-700 text-sm">₹{sampleSgst.toFixed(2)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
              <span className="text-[10px] text-emerald-100 block uppercase font-medium">Final Total</span>
              <span className="font-black text-sm">₹{sampleTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GstTaxSettingsTab
