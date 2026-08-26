import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Building2, Layers, DollarSign } from "lucide-react";
import api from "../../lib/api";
import { useLocation } from "../../context/LocationContext";

const schema = z.object({
  propertyId: z.string().min(1, "Select property location"),
  towerName: z.string().min(1, "Tower / Block name is required"),
  unitNumber: z.string().min(1, "Unit / Flat number is required"),
  floorNumber: z.coerce.number().min(0, "Floor number required"),
  unitType: z.enum(["FLAT", "VILLA", "ROW_HOUSE", "PENTHOUSE", "STUDIO", "SENIOR_SUITE"]),
  occupancyModel: z.enum(["OWNER_OCCUPIED", "TENANT_RENTED", "VACANT", "UNDER_REPAIR"]).default("VACANT"),
  carpetAreaSqft: z.coerce.number().min(100, "Carpet area sqft required"),
  baseMonthlyRent: z.coerce.number().min(0, "Rent required"),
  facing: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const UNIT_TYPES = [
  { id: "FLAT", label: "Flat / Apartment" },
  { id: "VILLA", label: "Retirement Villa" },
  { id: "ROW_HOUSE", label: "Row House" },
  { id: "PENTHOUSE", label: "Penthouse" },
  { id: "STUDIO", label: "Studio Suite" },
  { id: "SENIOR_SUITE", label: "Assisted Senior Suite" },
];

export default function FlatCreationPage() {
  const navigate = useNavigate();
  const { properties, selectedLocationId } = useLocation();
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      propertyId: selectedLocationId !== "ALL" ? selectedLocationId : properties[0]?.id || "",
      unitType: "FLAT",
      floorNumber: 1,
      carpetAreaSqft: 950,
      baseMonthlyRent: 25000,
    },
  });

  useEffect(() => {
    if (selectedLocationId !== "ALL") {
      setValue("propertyId", selectedLocationId);
    } else if (properties.length > 0) {
      setValue("propertyId", properties[0].id);
    }
  }, [selectedLocationId, properties, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setApiError("");
    setSuccess(false);
    try {
      await api.post(`/properties/${data.propertyId}/units`, data);
      setSuccess(true);
      reset();
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Failed to create unit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 flex flex-col min-h-screen w-full">
      <div className="w-full">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200/80 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Add Residential Asset / Unit
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Provision new flats, villas, penthouses or senior assisted suites into property inventory.
            </p>
          </div>

          <button
            onClick={() => navigate("/properties")}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm inline-flex items-center gap-2 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Back to Properties List</span>
          </button>
        </header>

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm">
          {success && (
            <div className="mb-6 rounded-xl px-4 py-3 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Unit asset provisioned successfully! You can add another unit below.</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
            {/* Section 1: Location & Target Facility */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-orange-500" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  1. Location Scope & Property Facility
                </h3>
              </div>

              <div>
                <label className="field-label">Target Property Facility *</label>
                <select {...register("propertyId")} id="property-select" className="field-input text-xs font-bold text-slate-800">
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      🏢 {p.title} ({p.locality}, {p.city})
                    </option>
                  ))}
                </select>
                {errors.propertyId && <p className="field-error">{errors.propertyId.message}</p>}
              </div>
            </div>

            {/* Section 2: Unit Identifiers */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  2. Building & Unit Identifiers
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="field-label">Tower / Block / Cluster Name *</label>
                  <input
                    {...register("towerName")}
                    id="tower-name"
                    placeholder="e.g. Tower A, Villa Cluster West"
                    className="field-input text-xs"
                  />
                  {errors.towerName && <p className="field-error">{errors.towerName.message}</p>}
                </div>

                <div>
                  <label className="field-label">Unit / Flat Number *</label>
                  <input
                    {...register("unitNumber")}
                    id="unit-number"
                    placeholder="e.g. Flat 402, Villa 12"
                    className="field-input text-xs"
                  />
                  {errors.unitNumber && <p className="field-error">{errors.unitNumber.message}</p>}
                </div>

                <div>
                  <label className="field-label">Unit Type *</label>
                  <select {...register("unitType")} id="unit-type" className="field-input text-xs font-semibold">
                    {UNIT_TYPES.map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Floor Number *</label>
                  <input
                    {...register("floorNumber")}
                    id="floor-number"
                    type="number"
                    placeholder="1"
                    className="field-input text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Specifications & Package */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  3. Specifications & Monthly Package
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="field-label">Carpet Area (Sq Ft) *</label>
                  <input
                    {...register("carpetAreaSqft")}
                    id="carpet-area"
                    type="number"
                    placeholder="950"
                    className="field-input text-xs"
                  />
                </div>

                <div>
                  <label className="field-label">Occupancy Type / Model *</label>
                  <select {...register("occupancyModel")} id="occupancy-model" className="field-input text-xs font-bold text-slate-800">
                    <option value="VACANT">⚪ Vacant & Available for Allotment</option>
                    <option value="OWNER_OCCUPIED">🏠 Owner Occupied (Purchased Flat)</option>
                    <option value="TENANT_RENTED">🔑 Tenant Rented (Monthly Lease)</option>
                    <option value="UNDER_REPAIR">🔧 Under Maintenance / Fit-out</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Base Monthly Package / Rent (₹) *</label>
                  <input
                    {...register("baseMonthlyRent")}
                    id="monthly-rent"
                    type="number"
                    placeholder="25000"
                    className="field-input text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="field-label">Facing Direction</label>
                  <select {...register("facing")} id="facing" className="field-input text-xs font-semibold">
                    <option value="EAST">East Facing</option>
                    <option value="NORTH_EAST">North-East Facing</option>
                    <option value="WEST">West Facing</option>
                    <option value="NORTH">North Facing</option>
                    <option value="SOUTH">South Facing</option>
                  </select>
                </div>
              </div>
            </div>

            {apiError && (
              <div className="rounded-xl px-4 py-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200">
                {apiError}
              </div>
            )}

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate("/properties")}
                className="btn-secondary text-xs font-bold py-3 px-6"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-orange text-xs font-bold py-3 px-8 shadow-md"
              >
                {loading ? "Provisioning..." : "Create Unit Asset →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
