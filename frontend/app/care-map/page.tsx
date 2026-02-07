"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Search,
  Star,
  Clock,
  Phone,
  Navigation,
  Stethoscope,
  Building2,
  Syringe,
  HeartPulse,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

const ProviderMap = dynamic(() => import("@/components/provider-map").then((m) => ({ default: m.ProviderMap })), {
  ssr: false,
});

const categories = [
  { icon: Stethoscope, label: "Primary Care", count: 24 },
  { icon: HeartPulse, label: "Urgent Care", count: 8 },
  { icon: Building2, label: "Hospitals", count: 3 },
  { icon: Syringe, label: "Labs", count: 12 },
];

/** Pittsburgh default */
const DEFAULT_LAT = 40.4406;
const DEFAULT_LNG = -79.9959;

interface Provider {
  id: string;
  placeId: string;
  name: string;
  type: string;
  address: string;
  distance: string;
  distanceMiles: number;
  rating: number | null;
  reviews: number | null;
  hours: string;
  copay: number | null;
  accepting: boolean;
  geo: { lat: number; lng: number };
  phone?: string;
  website?: string;
}

/** Network is set in Dashboard; hardcoded to UPMC for now */
const ACTIVE_PLAN_ID = "upmc";

/** Heuristic network status based on provider name (demo only - not real) */
function getNetworkStatus(
  providerName: string,
  planId: string
): { inNetwork: boolean; label: string; confidence: string } {
  const name = providerName.toLowerCase();

  if (name.includes("upmc")) {
    return planId === "upmc"
      ? { inNetwork: true, label: "In-Net", confidence: "~90%" }
      : { inNetwork: false, label: "Out-of-Net", confidence: "~75%" };
  }
  if (name.includes("ahn") || name.includes("allegheny")) {
    return planId === "aetna"
      ? { inNetwork: true, label: "In-Net", confidence: "~85%" }
      : { inNetwork: false, label: "Out-of-Net", confidence: "~70%" };
  }
  if (name.includes("medexpress") || name.includes("convenientcare") || name.includes("convenient care")) {
    return { inNetwork: true, label: "Likely In-Net", confidence: "~60%" };
  }
  if (name.includes("urgent care")) {
    return { inNetwork: true, label: "Likely In-Net", confidence: "~50%" };
  }
  return { inNetwork: false, label: "Unknown", confidence: "~30%" };
}

export default function CareMap() {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);
  const [inNetworkOnly, setInNetworkOnly] = useState(false);
  const [locationDisplayText, setLocationDisplayText] = useState<string>("Pittsburgh, PA");
  const [locationEditing, setLocationEditing] = useState(false);
  const [locationEditValue, setLocationEditValue] = useState("");
  const [locationUpdating, setLocationUpdating] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const lat = location?.lat ?? DEFAULT_LAT;
    const lng = location?.lng ?? DEFAULT_LNG;

    try {
      const body: Record<string, unknown> = {
        lat,
        lng,
        radius_miles: 15,
        limit: 20,
      };
      if (searchQuery.trim()) body.q = searchQuery.trim();
      if (activeCategory) {
        body.type = activeCategory === "Urgent Care" ? undefined : activeCategory;
        if (activeCategory === "Urgent Care") body.q = "urgent care";
      }

      const res = await fetch("/api/providers-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Search failed (${res.status})`);
      setProviders(data.providers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [location, searchQuery, activeCategory]);

  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }
    setLoading(true);
    setError(null);
    setLocationInfo(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationEnabled(true);
        setLocationInfo(null);
        setLoading(false);
      },
      () => {
        setLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
        setLocationEnabled(true);
        setLocationInfo("Using Pittsburgh area (location access denied or unavailable)");
        setError(null);
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    if (locationEnabled || location) {
      fetchProviders();
    }
  }, [locationEnabled, location?.lat, location?.lng, fetchProviders]);

  // Reverse geocode when location changes to get display text (city/address)
  useEffect(() => {
    if (!location?.lat || !location?.lng) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: location.lat, lng: location.lng }),
        });
        const data = await res.json();
        if (!cancelled && data.short_label) setLocationDisplayText(data.short_label);
      } catch {
        if (!cancelled) setLocationDisplayText(`${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [location?.lat, location?.lng]);

  const handleLocationSave = async () => {
    const addr = locationEditValue.trim();
    if (!addr) {
      setLocationEditing(false);
      return;
    }
    setLocationUpdating(true);
    setError(null);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not find that address");
      setLocation({ lat: data.lat, lng: data.lng });
      setLocationDisplayText(data.formatted_address ?? addr);
      setLocationEnabled(true);
      setLocationEditing(false);
      setLocationEditValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid address");
    } finally {
      setLocationUpdating(false);
    }
  };

  const handleLocationCancel = () => {
    setLocationEditing(false);
    setLocationEditValue("");
    setError(null);
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationChecked(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationEnabled(true);
        setLocationChecked(true);
      },
      () => {
        setLocationChecked(true);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location && !locationEnabled) {
      setLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      setLocationEnabled(true);
    }
    fetchProviders();
  };

  const filteredProviders = inNetworkOnly
    ? providers.filter((p) => getNetworkStatus(p.name, ACTIVE_PLAN_ID).inNetwork)
    : providers;

  const mapCenter = selectedProvider?.geo ?? location ?? { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  const mapsUrl = `https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}`;

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-96 border-r border-border flex flex-col bg-background">
        <div className="p-4 border-b border-border">
          <h1 className="font-display font-bold text-xl text-foreground mb-4">
            Find Care
          </h1>

          {/* Current location — click to edit */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Current location</p>
            {locationEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter address or city..."
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  value={locationEditValue}
                  onChange={(e) => setLocationEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLocationSave())}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleLocationSave}
                  disabled={locationUpdating}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {locationUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleLocationCancel}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLocationEditValue(locationDisplayText);
                  setLocationEditing(true);
                }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-input bg-card text-left hover:bg-muted/50 transition-colors group"
              >
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{locationDisplayText}</span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground">Change</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search providers, specialties..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap">
              <button
                type="button"
                onClick={() => setInNetworkOnly(!inNetworkOnly)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  inNetworkOnly
                    ? "bg-success/20 text-success border border-success/40"
                    : "bg-card border border-border hover:bg-muted text-foreground"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                In-Network only
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                    activeCategory === cat.label
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-card border border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search Providers
            </button>
          </form>
        </div>

        {error && (
          <div className="mx-4 my-2 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {locationInfo && !error && (
          <div className="mx-4 my-2 flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0 text-secondary" />
            {locationInfo}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              {loading ? "Searching..." : `${filteredProviders.length} providers near you`}
            </p>
          </div>

          {loading && filteredProviders.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedProvider?.id === provider.id ? "bg-muted/50" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.type}</p>
                    </div>
                    {(() => {
                      const status = getNetworkStatus(provider.name, ACTIVE_PLAN_ID);
                      return (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                            status.inNetwork
                              ? "bg-success/10 text-success"
                              : status.label === "Unknown"
                                ? "bg-muted text-muted-foreground"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {status.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {provider.distance}
                    </span>
                    {provider.rating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-warning fill-warning" />
                        {provider.rating.toFixed(1)}
                        {provider.reviews != null && ` (${provider.reviews})`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sm text-success">
                      <Clock className="w-3 h-3" />
                      {provider.hours}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-muted">
        {!locationChecked ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-secondary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Getting your location...</p>
            </div>
          </div>
        ) : !locationEnabled && !location ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-secondary" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                Interactive Map
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs mb-4">
                Enable location or search to see healthcare providers near you
              </p>
              <button
                type="button"
                onClick={handleEnableLocation}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold transition-colors shadow-card"
              >
                <Navigation className="w-4 h-4" />
                Enable Location
              </button>
              <p className="mt-4 text-xs text-muted-foreground">
                Or use &quot;Search Providers&quot; to search Pittsburgh area
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 w-full h-full">
              <ProviderMap
                providers={filteredProviders.map((p) => ({
                  ...p,
                  inNetwork: getNetworkStatus(p.name, ACTIVE_PLAN_ID).inNetwork,
                }))}
                center={mapCenter}
                selectedProvider={selectedProvider}
                onSelectProvider={(p) => {
                const full = filteredProviders.find((x) => x.id === p.id);
                if (full) setSelectedProvider(full);
              }}
              />
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-3 z-[1000] inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border shadow-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Open in Google Maps
              </a>
            </div>

            {selectedProvider && (
              <div className="absolute bottom-6 left-6 right-6 max-w-lg">
                <div className="bg-card rounded-xl border border-border shadow-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-foreground">
                        {selectedProvider.name}
                      </h3>
                      <p className="text-muted-foreground">{selectedProvider.type}</p>
                    </div>
                    {selectedProvider.rating != null && (
                      <div className="flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="font-medium text-foreground">
                          {selectedProvider.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      {selectedProvider.address} • {selectedProvider.distance}
                    </p>
                    <p className="flex items-center gap-2 text-success">
                      <Clock className="w-4 h-4 shrink-0" />
                      {selectedProvider.hours}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Network status</p>
                      {(() => {
                        const s = getNetworkStatus(selectedProvider.name, ACTIVE_PLAN_ID);
                        return (
                          <p className={`font-semibold whitespace-nowrap ${s.inNetwork ? "text-success" : s.label === "Unknown" ? "text-muted-foreground" : "text-destructive"}`}>
                            {s.label}
                            {s.confidence && <span className="text-muted-foreground font-normal text-xs ml-1">({s.confidence})</span>}
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {selectedProvider.phone && (
                      <a
                        href={`tel:${selectedProvider.phone}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-foreground font-medium"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedProvider.geo.lat},${selectedProvider.geo.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      Directions
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
