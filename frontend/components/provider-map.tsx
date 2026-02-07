"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapProvider {
  id: string;
  name: string;
  type: string;
  address: string;
  geo: { lat: number; lng: number };
  inNetwork?: boolean;
}

interface ProviderMapProps<T extends MapProvider = MapProvider> {
  providers: T[];
  center: { lat: number; lng: number };
  selectedProvider: T | null;
  onSelectProvider: (provider: T) => void;
}

const inNetworkPinColor = "hsl(173, 58%, 39%)"; // teal/green
const outOfNetworkPinColor = "hsl(0, 70%, 50%)"; // red
const selectedPinColor = "hsl(209, 55%, 25%)"; // dark blue

function createPinIcon(inNetwork: boolean, selected: boolean): L.DivIcon {
  const size = selected ? 32 : 24;
  const border = selected ? 3 : 2;
  const color = selected ? selectedPinColor : inNetwork ? inNetworkPinColor : outOfNetworkPinColor;
  return L.divIcon({
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: ${border}px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    className: "custom-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

export function ProviderMap<T extends MapProvider>({
  providers,
  center,
  selectedProvider,
  onSelectProvider,
}: ProviderMapProps<T>) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const map = L.map("provider-map", {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    providers.forEach((provider) => {
      const inNet = provider.inNetwork !== false;
      const isSelected = selectedProvider?.id === provider.id;
      const marker = L.marker([provider.geo.lat, provider.geo.lng], {
        icon: createPinIcon(inNet, isSelected),
      })
        .addTo(map)
        .on("click", () => onSelectProvider(provider));

      marker.bindTooltip(provider.name, {
        permanent: false,
        direction: "top",
        offset: [0, -10],
      });

      markersRef.current.push(marker);
    });

    if (providers.length > 1) {
      const bounds = L.latLngBounds(providers.map((p) => [p.geo.lat, p.geo.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (providers.length === 1) {
      map.setView([providers[0].geo.lat, providers[0].geo.lng], 14);
    } else {
      map.setView([center.lat, center.lng], 13);
    }
  }, [providers, onSelectProvider, center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m, i) => {
      const provider = providers[i];
      if (provider) {
        const inNet = provider.inNetwork !== false;
        const isSelected = selectedProvider?.id === provider.id;
        m.setIcon(createPinIcon(inNet, isSelected));
      }
    });
  }, [selectedProvider, providers]);

  return <div id="provider-map" className="w-full h-full min-h-[400px]" />;
}
