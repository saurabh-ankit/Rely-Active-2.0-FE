import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import api from "../lib/api";

export interface PropertyOption {
  id: string;
  title: string;
  city: string;
  locality: string;
}

interface LocationContextType {
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  properties: PropertyOption[];
  loadingProperties: boolean;
  refreshProperties: () => Promise<void>;
  selectedLocationName: string;
}

const LocationContext = createContext<LocationContextType>({
  selectedLocationId: "ALL",
  setSelectedLocationId: () => {},
  properties: [],
  loadingProperties: false,
  refreshProperties: async () => {},
  selectedLocationName: "All Locations (Consolidated)",
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    return localStorage.getItem("ra_selected_location") || "ALL";
  });
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const fetchProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await api.get("/properties");
      setProperties(res.data.data || []);
    } catch (err) {
      console.error("Failed to load properties list", err);
    } finally {
      setLoadingProperties(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleSelectLocation = (id: string) => {
    setSelectedLocationId(id);
    localStorage.setItem("ra_selected_location", id);
  };

  const selectedProperty = properties.find((p) => p.id === selectedLocationId);
  const selectedLocationName = selectedLocationId === "ALL"
    ? "All Locations (Consolidated)"
    : selectedProperty
    ? `${selectedProperty.title} (${selectedProperty.city})`
    : "Selected Property";

  return (
    <LocationContext.Provider
      value={{
        selectedLocationId,
        setSelectedLocationId: handleSelectLocation,
        properties,
        loadingProperties,
        refreshProperties: fetchProperties,
        selectedLocationName,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
