import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icons
import L, { LatLngExpression } from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

async function geocodeCache(place: string): Promise<[number, number] | null> {
  if (!place) return null;
  const key = `geo_${place.toLowerCase().trim()}`;
  const cached = localStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place + ', Angola')}&format=json&limit=1`);
    const data = await res.json();
    if (data && data.length > 0) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number];
      localStorage.setItem(key, JSON.stringify(coords));
      return coords;
    }
  } catch (error) {
    console.warn(`Geocode failed for ${place}`, error);
  }
  return null;
}

function MapBoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 13);
      } else {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, points]);
  return null;
}

interface TripRouteMapProps {
  origin: string;
  destination: string;
  className?: string;
  title?: string;
}

export function TripRouteLayer({ origin, destination, title }: Omit<TripRouteMapProps, 'className'>) {
  const { data: originCoords } = useQuery({
    queryKey: ['geocode', origin],
    queryFn: () => geocodeCache(origin),
    staleTime: Infinity,
    enabled: !!origin
  });

  const { data: destCoords } = useQuery({
    queryKey: ['geocode', destination],
    queryFn: () => geocodeCache(destination),
    staleTime: Infinity,
    enabled: !!destination
  });

  return (
    <>
      {originCoords && (
        <Marker position={originCoords}>
          <Popup><strong>{title || "Viagem"}</strong><br/>Origem: {origin}</Popup>
        </Marker>
      )}
      {destCoords && (
        <Marker position={destCoords}>
          <Popup><strong>{title || "Viagem"}</strong><br/>Destino: {destination}</Popup>
        </Marker>
      )}
      {originCoords && destCoords && (
        <Polyline positions={[originCoords, destCoords]} pathOptions={{ color: 'blue', weight: 3, dashArray: '5, 10' }} />
      )}
    </>
  );
}

export function TripRouteMap({ origin, destination, className = "h-64 w-full", title }: TripRouteMapProps) {
  const { data: originCoords } = useQuery({
    queryKey: ['geocode', origin],
    queryFn: () => geocodeCache(origin),
    staleTime: Infinity,
    enabled: !!origin
  });

  const { data: destCoords } = useQuery({
    queryKey: ['geocode', destination],
    queryFn: () => geocodeCache(destination),
    staleTime: Infinity,
    enabled: !!destination
  });

  const center: LatLngExpression = originCoords || destCoords || [-8.8368, 13.2343]; // Default Luanda
  const points = [originCoords, destCoords].filter(Boolean) as [number, number][];

  return (
    <div className={`relative z-0 overflow-hidden ${className}`}>
      <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution="&copy; OpenStreetMap" 
        />
        <TripRouteLayer origin={origin} destination={destination} title={title} />
        <MapBoundsFitter points={points} />
      </MapContainer>
    </div>
  );
}
