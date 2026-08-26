import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ArrowRight,
  Plus,
  X,
  MapPin,
  Layers,
  FileCheck,
  Check,
  Home,
  ChevronDown,
  ChevronRight,
  Sliders,
  Trash2,
} from "lucide-react";
import api from "../../lib/api";
import { useLocation } from "../../context/LocationContext";

const DEFAULT_VIEWS = ["Road View", "Garden View", "Sea View", "City View", "Pool View", "Mountain View"];

const BUILDING_FEATURES = [
  "Elevator", "Senior Citizen Area", "Gymnasium", "Waste Disposal",
  "CCTV Surveillance", "Earthquake Resistant", "Wheelchair Accessibility", "Rainwater Harvesting",
  "Club House", "Fire Safety", "Service Lift", "Intercom Facility",
  "Security", "Visitor Parking", "Power Backup", "Kids Play Area"
];

const AMENITIES = [
  "Swimming Pool", "Community Hall", "Basketball Court", "Banquet Hall",
  "Amphitheatre", "Library", "Spa", "Squash Court",
  "Pet Area", "Cafeteria", "Golf Course", "Badminton Court",
  "Meditation Area", "Indoor Games", "Multipurpose Hall", "BBQ Area",
  "Cycling Track", "Yoga Deck", "Garden", "Tennis Court",
  "Sauna", "Concierge Service", "Jogging Track", "Outdoor Sports"
];

interface BHKRow {
  id: string;
  type: string;
  carpet: number;
  sba: number;
  price: number;
  layout: string;
}

interface StructureEntity {
  id: string;
  name: string;
  type: "Tower" | "Villa" | "Duplex" | "Triplex";
  totalFloors: number;
  unitsPerFloor: number;
  prefix: string;
  pricePerSqft: number;
  nomenclatureTemplate: string;
  bhkTemplates: string[];
  bhkRows: BHKRow[];
}

export default function CreatePropertyWizardPage() {
  const navigate = useNavigate();
  const { refreshProperties } = useLocation();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State - Step 1: Basic Details
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [developerName, setDeveloperName] = useState("");
  const [constructionStatus, setConstructionStatus] = useState("COMPLETED");
  const [reraNumber, setReraNumber] = useState("");
  const [possessionDate, setPossessionDate] = useState("");
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [description, setDescription] = useState("");

  // Views Configuration
  const [views, setViews] = useState<string[]>(DEFAULT_VIEWS);
  const [newViewInput, setNewViewInput] = useState("");

  // Step 2: Features & Amenities
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "Elevator", "CCTV Surveillance", "Security", "Wheelchair Accessibility", "Power Backup"
  ]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "Community Hall", "Library", "Garden", "Meditation Area"
  ]);

  // Step 3: Structure Entities Tree (1:1 with Rely CRM Screenshot 6)
  const [structureEntities, setStructureEntities] = useState<StructureEntity[]>([
    {
      id: "ent-1",
      name: "Tower A",
      type: "Tower",
      totalFloors: 10,
      unitsPerFloor: 4,
      prefix: "A",
      pricePerSqft: 5000,
      nomenclatureTemplate: "{{TowerPrefix}}-{{FloorNumber}}{{Position}}",
      bhkTemplates: [],
      bhkRows: [],
    },
  ]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("ent-1");
  const [selectedFloorNum, setSelectedFloorNum] = useState<number | null>(null);
  const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({ "ent-1": true });
  const [showAddEntityDropdown, setShowAddEntityDropdown] = useState(false);

  // API State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAddView = () => {
    if (newViewInput.trim() && !views.includes(newViewInput.trim())) {
      setViews([...views, newViewInput.trim()]);
      setNewViewInput("");
    }
  };

  const handleRemoveView = (v: string) => {
    setViews(views.filter((item) => item !== v));
  };

  const toggleFeature = (f: string) => {
    setSelectedFeatures(
      selectedFeatures.includes(f) ? selectedFeatures.filter((i) => i !== f) : [...selectedFeatures, f]
    );
  };

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(
      selectedAmenities.includes(a) ? selectedAmenities.filter((i) => i !== a) : [...selectedAmenities, a]
    );
  };

  // Add Structure Entity (Tower / Villa / Duplex / Triplex)
  const handleAddEntity = (type: "Tower" | "Villa" | "Duplex" | "Triplex") => {
    const count = structureEntities.filter((e) => e.type === type).length + 1;
    const id = `ent-${Date.now()}`;
    const newEnt: StructureEntity = {
      id,
      name: `${type} ${String.fromCharCode(64 + count)}`,
      type,
      totalFloors: type === "Tower" ? 10 : 2,
      unitsPerFloor: type === "Tower" ? 4 : 1,
      prefix: String.fromCharCode(64 + count),
      pricePerSqft: 5000,
      nomenclatureTemplate: "{{TowerPrefix}}-{{FloorNumber}}{{Position}}",
      bhkTemplates: [],
      bhkRows: [],
    };
    setStructureEntities([...structureEntities, newEnt]);
    setSelectedEntityId(id);
    setSelectedFloorNum(null);
    setExpandedEntities({ ...expandedEntities, [id]: true });
    setShowAddEntityDropdown(false);
  };

  const toggleEntityExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEntities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeEntity = structureEntities.find((e) => e.id === selectedEntityId) || structureEntities[0];

  const updateActiveEntity = (fields: Partial<StructureEntity>) => {
    if (!activeEntity) return;
    setStructureEntities(
      structureEntities.map((e) => (e.id === activeEntity.id ? { ...e, ...fields } : e))
    );
  };

  const toggleBhkChip = (bhk: string) => {
    if (!activeEntity) return;
    const currentChips = activeEntity.bhkTemplates || [];
    const isSelected = currentChips.includes(bhk);
    const updatedChips = isSelected ? currentChips.filter((b) => b !== bhk) : [...currentChips, bhk];

    let updatedRows = activeEntity.bhkRows || [];
    if (!isSelected) {
      // Add BHK row
      updatedRows = [
        ...updatedRows,
        {
          id: `bhk-${Date.now()}-${bhk}`,
          type: bhk,
          carpet: bhk === "1BHK" ? 450 : bhk === "2BHK" ? 750 : bhk === "3BHK" ? 1100 : 1500,
          sba: bhk === "1BHK" ? 600 : bhk === "2BHK" ? 1000 : bhk === "3BHK" ? 1450 : 2000,
          price: (bhk === "1BHK" ? 450 : bhk === "2BHK" ? 750 : bhk === "3BHK" ? 1100 : 1500) * (activeEntity.pricePerSqft || 5000),
          layout: "Standard Layout",
        },
      ];
    } else {
      // Remove BHK row
      updatedRows = updatedRows.filter((r) => r.type !== bhk);
    }

    updateActiveEntity({ bhkTemplates: updatedChips, bhkRows: updatedRows });
  };

  const removeBhkRow = (rowId: string) => {
    if (!activeEntity) return;
    const updatedRows = activeEntity.bhkRows.filter((r) => r.id !== rowId);
    const remainingTypes = Array.from(new Set(updatedRows.map((r) => r.type)));
    updateActiveEntity({ bhkRows: updatedRows, bhkTemplates: remainingTypes });
  };

  const handleSubmitProperty = async () => {
    if (!title || !address || !city || !locality) {
      setErrorMsg("Please fill in all required basic fields (Title, Address, City, Locality).");
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await api.post("/properties", {
        title,
        developerName: developerName || "Rely Senior Living",
        constructionStatus,
        reraNumber: reraNumber || null,
        possessionDate: possessionDate ? new Date(possessionDate) : null,
        address,
        locality,
        landmark: landmark || null,
        city,
        state: state || "Telangana",
        pincode: pincode || "500081",
        country: country || "India",
        description: description || null,
        propertyType: ["RETIREMENT_VILLA", "ASSISTED_LIVING", "APARTMENT"],
        buildingFeatures: selectedFeatures,
        amenities: selectedAmenities,
        bhkConfigs: structureEntities,
      });

      await refreshProperties();
      navigate("/properties");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to submit property.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Basic Details", icon: Home },
    { num: 2, label: "Feature & Amenities", icon: Sliders },
    { num: 3, label: "Structure & Units", icon: Layers },
    { num: 4, label: "Review & Activate", icon: FileCheck },
  ];

  return (
    <div className="min-h-screen p-6 md:p-8 flex flex-col w-full">
      <div className="w-full">
        {/* Stepper Navigation Bar (1:1 Screenshots 3-6) */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200 shadow-sm mb-8 flex items-center gap-1 overflow-x-auto">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.num;
            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#1E3A8A] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-xl p-4 text-xs font-bold text-red-700 bg-red-50 border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* ── STEP 1: BASIC DETAILS ────────────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-6 w-full">
            {/* Project Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <Home className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Project Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="field-label">Property Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a descriptive title"
                    className="field-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Select Project *</label>
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="field-input text-xs font-semibold"
                  >
                    <option value="">Select a project</option>
                    <option value="SUNRISE">Sunrise Senior Living</option>
                    <option value="REVERELY">Reverely Campus</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Developer Name</label>
                  <input
                    type="text"
                    value={developerName}
                    onChange={(e) => setDeveloperName(e.target.value)}
                    placeholder="Enter developer name"
                    className="field-input text-xs"
                  />
                </div>

                <div>
                  <label className="field-label">Facility Operational Status *</label>
                  <select
                    value={constructionStatus}
                    onChange={(e) => setConstructionStatus(e.target.value)}
                    className="field-input text-xs font-semibold"
                  >
                    <option value="COMPLETED">Fully Operational & Ready for Admissions</option>
                    <option value="READY_TO_MOVE">Phase 1 Ready for Occupancy</option>
                    <option value="UNDER_CONSTRUCTION">Under Renovation / Fit-out</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Govt / License Registration No.</label>
                  <input
                    type="text"
                    value={reraNumber}
                    onChange={(e) => setReraNumber(e.target.value)}
                    placeholder="Enter registration or RERA license number"
                    className="field-input text-xs"
                  />
                </div>

                <div>
                  <label className="field-label">Possession Date</label>
                  <input
                    type="date"
                    value={possessionDate}
                    onChange={(e) => setPossessionDate(e.target.value)}
                    className="field-input text-xs"
                  />
                </div>
              </div>
            </div>

            {/* View Configuration Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <Layers className="w-5 h-5 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    View Configuration
                  </h2>
                  <p className="text-xs text-slate-400">Define property views for unit selection and PLC pricing</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <input
                  type="text"
                  value={newViewInput}
                  onChange={(e) => setNewViewInput(e.target.value)}
                  placeholder="e.g. Sea View, Golf Course View"
                  className="field-input text-xs flex-1"
                />
                <button type="button" onClick={handleAddView} className="btn-secondary text-xs py-2 px-4 font-bold flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add View
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {views.map((v) => (
                  <span key={v} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700">
                    {v}
                    <button type="button" onClick={() => handleRemoveView(v)} className="text-slate-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Location Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Location & Address
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="field-label">Street Address *</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete property address"
                    rows={2}
                    className="field-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Locality / Area *</label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="Enter locality or area"
                    className="field-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Landmark</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Enter nearby landmark"
                    className="field-input text-xs"
                  />
                </div>

                <div>
                  <label className="field-label">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city"
                    className="field-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">State *</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Enter state"
                    className="field-input text-xs"
                  />
                </div>

                <div>
                  <label className="field-label">Pincode *</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter pincode"
                    className="field-input text-xs"
                  />
                </div>

                <div>
                  <label className="field-label">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="field-input text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="field-label">Facility Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Include key highlights, neighborhood info, and special features..."
                    rows={2}
                    className="field-input text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn-orange text-xs font-bold py-3 px-6 shadow-md flex items-center gap-2"
              >
                <span>Continue to Feature & Amenities</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: FEATURE & AMENITIES ──────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-6 w-full">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <Home className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Building Features & Amenities
                </h2>
              </div>

              {/* Building Features */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">Building Features</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6">
                  {BUILDING_FEATURES.map((f) => {
                    const selected = selectedFeatures.includes(f);
                    return (
                      <label key={f} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleFeature(f)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                        <span>{f}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Amenities */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6">
                  {AMENITIES.map((a) => {
                    const selected = selectedAmenities.includes(a);
                    return (
                      <label key={a} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAmenity(a)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                        <span>{a}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary text-xs font-bold py-3 px-6">
                Back
              </button>
              <button type="button" onClick={() => setCurrentStep(3)} className="btn-orange text-xs font-bold py-3 px-6 shadow-md flex items-center gap-2">
                <span>Continue to Structure</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: STRUCTURE (1:1 Screenshot 6 Parity) ────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Left Panel: Property Structure Tree Card */}
              <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm min-h-[520px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 text-sm">Property Structure</h3>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAddEntityDropdown(!showAddEntityDropdown)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                        <span>Add Entity</span>
                      </button>

                      {showAddEntityDropdown && (
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-30 flex flex-col gap-0.5 text-xs">
                          {(["Tower", "Villa", "Duplex", "Triplex"] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleAddEntity(type)}
                              className="px-3 py-2 rounded-lg text-left font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                            >
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>{type}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {structureEntities.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                      <Layers className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-500">Add an entity to start configuration</p>
                    </div>
                  ) : (
                    <div className="space-y-1 overflow-y-auto max-h-[440px] pr-1">
                      {structureEntities.map((e) => {
                        const isSelected = e.id === activeEntity?.id && selectedFloorNum === null;
                        const isExpanded = !!expandedEntities[e.id];
                        const floorsList = Array.from({ length: Math.max(1, e.totalFloors) }, (_, i) => i + 1);

                        return (
                          <div key={e.id} className="space-y-0.5">
                            {/* Parent Entity Item */}
                            <div
                              onClick={() => {
                                setSelectedEntityId(e.id);
                                setSelectedFloorNum(null);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer border transition-all ${
                                isSelected
                                  ? "bg-[#1E3A8A]/10 border-[#1E3A8A]/30 text-[#1E3A8A] font-extrabold shadow-sm"
                                  : "bg-white border-transparent hover:bg-slate-50 text-slate-700 font-semibold"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={(evt) => toggleEntityExpanded(e.id, evt)}
                                  className="p-0.5 hover:bg-slate-200/60 rounded transition-colors text-slate-400"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </span>
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <span>{e.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{e.type}</span>
                            </div>

                            {/* Child Floor Nodes */}
                            {isExpanded && (
                              <div className="pl-6 space-y-0.5 border-l border-slate-200 ml-3.5 py-0.5">
                                {floorsList.map((floorNum) => {
                                  const isFloorSelected = e.id === activeEntity?.id && selectedFloorNum === floorNum;
                                  return (
                                    <div
                                      key={floorNum}
                                      onClick={() => {
                                        setSelectedEntityId(e.id);
                                        setSelectedFloorNum(floorNum);
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                        isFloorSelected
                                          ? "bg-orange-100 text-orange-800 font-bold"
                                          : "text-slate-600 hover:bg-slate-100"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <ChevronRight className="w-3 h-3 text-slate-300" />
                                        <span>Floor {floorNum}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-semibold">0 units</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Entity Detail Configuration Card (1:1 Screenshot 6) */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6 min-h-[520px]">
                {activeEntity ? (
                  <>
                    {/* Title + Type Badge */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                          {activeEntity.name}
                        </h2>
                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                          {activeEntity.type}
                        </span>
                      </div>
                    </div>

                    {/* Inputs Row 1: Tower Name, Total Floors, Units / floor */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Tower name</label>
                        <input
                          type="text"
                          value={activeEntity.name}
                          onChange={(e) => updateActiveEntity({ name: e.target.value })}
                          className="field-input text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Total floors</label>
                        <input
                          type="number"
                          min={1}
                          value={activeEntity.totalFloors}
                          onChange={(e) => updateActiveEntity({ totalFloors: Number(e.target.value) })}
                          className="field-input text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Units / floor</label>
                        <input
                          type="number"
                          min={1}
                          value={activeEntity.unitsPerFloor}
                          onChange={(e) => updateActiveEntity({ unitsPerFloor: Number(e.target.value) })}
                          className="field-input text-xs"
                        />
                      </div>
                    </div>

                    {/* Inputs Row 2: Prefix, Est. Monthly Package (₹) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Prefix</label>
                        <input
                          type="text"
                          value={activeEntity.prefix}
                          onChange={(e) => updateActiveEntity({ prefix: e.target.value })}
                          className="field-input text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-700 block mb-1">Est. Monthly Package (₹)</label>
                        <input
                          type="number"
                          value={activeEntity.pricePerSqft}
                          onChange={(e) => updateActiveEntity({ pricePerSqft: Number(e.target.value) })}
                          placeholder="e.g. 25000"
                          className="field-input text-xs"
                        />
                      </div>
                    </div>

                    {/* Unit Nomenclature Template */}
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">Unit nomenclature template</label>
                      <input
                        type="text"
                        value={activeEntity.nomenclatureTemplate}
                        onChange={(e) => updateActiveEntity({ nomenclatureTemplate: e.target.value })}
                        className="field-input text-xs"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Tokens: <span className="font-mono text-slate-600">{"{{TowerPrefix}}, {{FloorNumber}}, {{Position}}, {{UnitNumber}}"}</span>
                      </p>
                    </div>

                    {/* BHK Templates Chips */}
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">BHK templates</label>
                      <p className="text-[11px] text-slate-400 mb-2">Click a BHK chip to add a new template variant.</p>
                      <div className="flex flex-wrap gap-2">
                        {["1BHK", "2BHK", "3BHK", "4BHK", "5BHK"].map((bhk) => {
                          const isSelected = (activeEntity.bhkTemplates || []).includes(bhk);
                          return (
                            <button
                              key={bhk}
                              type="button"
                              onClick={() => toggleBhkChip(bhk)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isSelected
                                  ? "bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-sm"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {bhk}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* BHK Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-extrabold text-slate-600">
                          <tr>
                            <th className="p-3">Type</th>
                            <th className="p-3">Carpet</th>
                            <th className="p-3">SBA</th>
                            <th className="p-3">Monthly Rent (₹)</th>
                            <th className="p-3">Layout</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {activeEntity.bhkRows && activeEntity.bhkRows.length > 0 ? (
                            activeEntity.bhkRows.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50">
                                <td className="p-3 font-bold text-slate-900">{row.type}</td>
                                <td className="p-3">{row.carpet} sqft</td>
                                <td className="p-3">{row.sba} sqft</td>
                                <td className="p-3 font-bold text-emerald-700">₹{row.price.toLocaleString()}</td>
                                <td className="p-3 text-slate-500">{row.layout}</td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeBhkRow(row.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-xs text-slate-400 font-medium">
                                Select one or more BHK chips to add template rows.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Layers className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Select an entity from the tree to view details.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary text-xs font-bold py-3 px-6">
                Back
              </button>
              <button type="button" onClick={() => setCurrentStep(4)} className="btn-orange text-xs font-bold py-3 px-6 shadow-md flex items-center gap-2">
                <span>Continue to Review & Activate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: REVIEW & ACTIVATE ──────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-6 w-full">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Review Facility & Activate Operational Suite
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Facility Title</span>
                  <p className="font-extrabold text-slate-800">{title || "Untitled Property"}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Location & Address</span>
                  <p className="font-extrabold text-slate-800">{locality ? `${locality}, ${city}` : "Not specified"}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Senior Living Features & Amenities</span>
                  <p className="font-extrabold text-slate-800">{selectedFeatures.length} Features · {selectedAmenities.length} Amenities</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Structure & Towers Configured</span>
                  <p className="font-extrabold text-slate-800">{structureEntities.length} Tower/Block Entities</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button type="button" onClick={() => setCurrentStep(3)} className="btn-secondary text-xs font-bold py-3 px-6">
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmitProperty}
                disabled={loading}
                className="btn-orange text-xs font-bold py-3 px-8 shadow-lg flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? "Activating Facility..." : "Activate Facility & Enable Resident Management"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
