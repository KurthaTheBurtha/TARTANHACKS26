import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const categories = [
  { icon: Stethoscope, label: "Primary Care", count: 24 },
  { icon: HeartPulse, label: "Urgent Care", count: 8 },
  { icon: Building2, label: "Hospitals", count: 3 },
  { icon: Syringe, label: "Labs", count: 12 },
];

const providers = [
  {
    id: 1,
    name: "CityMD Urgent Care",
    type: "Urgent Care",
    address: "123 Main St, Suite 100",
    distance: "0.4 miles",
    rating: 4.8,
    reviews: 234,
    hours: "Open until 10 PM",
    copay: 75,
    accepting: true,
    image: null,
  },
  {
    id: 2,
    name: "Dr. Sarah Chen, MD",
    type: "Primary Care",
    address: "456 Oak Ave, Floor 3",
    distance: "0.6 miles",
    rating: 4.9,
    reviews: 156,
    hours: "Open until 6 PM",
    copay: 25,
    accepting: true,
    image: null,
  },
  {
    id: 3,
    name: "Quest Diagnostics",
    type: "Lab",
    address: "789 Pine Blvd",
    distance: "0.8 miles",
    rating: 4.2,
    reviews: 89,
    hours: "Open until 5 PM",
    copay: 0,
    accepting: true,
    image: null,
  },
  {
    id: 4,
    name: "Valley Medical Center",
    type: "Hospital",
    address: "1000 Health Way",
    distance: "1.2 miles",
    rating: 4.5,
    reviews: 445,
    hours: "24 hours",
    copay: null,
    accepting: true,
    image: null,
  },
  {
    id: 5,
    name: "Dr. Michael Park, MD",
    type: "Primary Care",
    address: "222 Elm Street",
    distance: "1.5 miles",
    rating: 4.7,
    reviews: 98,
    hours: "Open until 5 PM",
    copay: 25,
    accepting: false,
    image: null,
  },
];

const CareMap = () => {
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredProviders = activeCategory
    ? providers.filter((p) => p.type === activeCategory)
    : providers;

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-96 border-r border-border flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h1 className="font-display font-bold text-xl text-foreground mb-4">
            Find Care
          </h1>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search providers, specialties..."
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.label
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Provider List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              {filteredProviders.length} in-network providers near you
            </p>
          </div>
          <div className="divide-y divide-border">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedProvider === provider.id ? "bg-muted/50" : "hover:bg-muted/30"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{provider.name}</h3>
                    <p className="text-sm text-muted-foreground">{provider.type}</p>
                  </div>
                  {provider.accepting ? (
                    <span className="text-xs font-medium bg-success/10 text-success px-2 py-1 rounded-full">
                      Accepting
                    </span>
                  ) : (
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      Waitlist
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {provider.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    {provider.rating} ({provider.reviews})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-success">
                    <Clock className="w-3 h-3" />
                    {provider.hours}
                  </span>
                  {provider.copay !== null && (
                    <span className="text-sm font-medium text-foreground">
                      ${provider.copay} copay
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-muted">
        {/* Placeholder for map */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-secondary" />
            </div>
            <h3 className="font-display font-semibold text-lg text-foreground mb-2">
              Interactive Map
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Connect your location to see in-network providers on the map
            </p>
            <Button variant="hero" size="lg" className="mt-4">
              <Navigation className="w-4 h-4" />
              Enable Location
            </Button>
          </div>
        </div>

        {/* Provider Detail Card */}
        {selectedProvider && (
          <div className="absolute bottom-6 left-6 right-6 max-w-lg">
            {(() => {
              const provider = providers.find((p) => p.id === selectedProvider);
              if (!provider) return null;
              return (
                <div className="bg-card rounded-xl border border-border shadow-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-foreground">
                        {provider.name}
                      </h3>
                      <p className="text-muted-foreground">{provider.type}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-full">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="font-medium text-foreground">{provider.rating}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {provider.address} • {provider.distance}
                    </p>
                    <p className="flex items-center gap-2 text-success">
                      <Clock className="w-4 h-4" />
                      {provider.hours}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Your estimated cost</p>
                      <p className="font-semibold text-foreground">
                        {provider.copay !== null ? `$${provider.copay} copay` : "Varies by service"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Network</p>
                      <p className="font-semibold text-success">In-Network ✓</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1">
                      <Phone className="w-4 h-4" />
                      Call
                    </Button>
                    <Button variant="hero" className="flex-1">
                      <Navigation className="w-4 h-4" />
                      Directions
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CareMap;
