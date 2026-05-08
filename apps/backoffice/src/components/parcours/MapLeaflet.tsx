'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Etape } from '@/src/types/api.types';

// Fix for default Leaflet icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icon for etapes (optional: make it a different color)
const etapeIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'hue-rotate-[150deg]', // Simple CSS hack to change color in Tailwind
});

interface MapLeafletProps {
  etapes: Etape[];
  pathGeoJSON?: any; // The parsed GeoJSON object
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (etape: Etape) => void;
}

function MapEvents({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

import { useMap } from 'react-leaflet';

function FitBounds({ geoJSON }: { geoJSON: any }) {
  const map = useMap();
  useEffect(() => {
    if (geoJSON) {
      try {
        const layer = L.geoJSON(geoJSON);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (err) {
        console.error("Erreur lors du recentrage de la carte :", err);
      }
    }
  }, [geoJSON, map]);
  return null;
}

export default function MapLeaflet({ etapes, pathGeoJSON, onMapClick, onMarkerClick }: MapLeafletProps) {
  // Center map on the first etape, or a default location (e.g., center of France)
  const defaultCenter: [number, number] = etapes.length > 0 
    ? [etapes[0].latitude, etapes[0].longitude] 
    : [46.603354, 1.888334];
    
  const defaultZoom = etapes.length > 0 ? 14 : 6;

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-border relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapEvents onMapClick={onMapClick} />
        <FitBounds geoJSON={pathGeoJSON} />

        {/* Tracé GPX / GeoJSON */}
        {pathGeoJSON && (
          <GeoJSON 
            key={JSON.stringify(pathGeoJSON).length} // Force recreation when data changes
            data={pathGeoJSON} 
            style={{
              color: '#10b981', // Tailwind emerald-500
              weight: 4,
              opacity: 0.8,
            }}
          />
        )}

        {/* Marqueurs des étapes */}
        {etapes.map((etape, index) => (
          <Marker 
            key={etape.id || `temp-${index}-${etape.latitude}`} 
            position={[etape.latitude, etape.longitude]}
            icon={etapeIcon}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(etape),
            }}
          >
            <Popup>
              <div className="p-1">
                <p className="font-bold text-sm mb-1">Étape {etape.order}</p>
                <p className="text-sm">{etape.title}</p>
                {onMarkerClick && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onMarkerClick(etape); }}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Modifier cette étape
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
