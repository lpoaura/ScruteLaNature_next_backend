'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Etape } from '@/src/types/api.types';

// Fix for default Leaflet icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;

function createLabelIcon(label: string, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      position:absolute;
      transform:translateX(-50%);
      background:${color};
      border:2px solid white;
      border-radius:4px;
      padding:3px 8px;
      color:white;
      font-weight:700;
      font-size:11px;
      font-family:sans-serif;
      white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    ">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -14],
  });
}

function getTraceEndpoints(geoJSON: any): { start: [number, number] | null; end: [number, number] | null } {
  const features: any[] = geoJSON?.features ?? [];
  const lines = features.filter(f => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString');
  if (lines.length === 0) return { start: null, end: null };

  let allCoords: [number, number][] = [];
  for (const f of lines) {
    if (f.geometry.type === 'LineString') {
      allCoords = [...allCoords, ...f.geometry.coordinates];
    } else {
      for (const seg of f.geometry.coordinates) allCoords = [...allCoords, ...seg];
    }
  }
  if (allCoords.length === 0) return { start: null, end: null };

  const first = allCoords[0];
  const last = allCoords[allCoords.length - 1];
  return {
    start: [first[1], first[0]],
    end: [last[1], last[0]],
  };
}

function createNumberedIcon(order: number, isActive = false) {
  const bg = isActive ? '#f59e0b' : '#10b981';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;
      background:${bg};
      border:2.5px solid white;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-weight:700;
      font-size:13px;
      font-family:sans-serif;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    ">${order}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

interface MapLeafletProps {
  etapes: Etape[];
  pathGeoJSON?: any;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (etape: Etape) => void;
  activeEtapeId?: string | null;
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

export default function MapLeaflet({ etapes, pathGeoJSON, onMapClick, onMarkerClick, activeEtapeId }: MapLeafletProps) {
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

        {/* Tracé GPX / GeoJSON — on filtre les waypoints (Point) pour ne garder que le tracé */}
        {pathGeoJSON && (() => {
          const traceOnly = {
            ...pathGeoJSON,
            features: (pathGeoJSON.features ?? []).filter(
              (f: any) => f.geometry?.type !== 'Point'
            ),
          };
          return traceOnly.features.length > 0 ? (
            <GeoJSON
              key={JSON.stringify(traceOnly).length}
              data={traceOnly}
              style={{ color: '#10b981', weight: 4, opacity: 0.8 }}
            />
          ) : null;
        })()}

        {/* Marqueurs Départ / Fin du tracé */}
        {pathGeoJSON && (() => {
          const { start, end } = getTraceEndpoints(pathGeoJSON);
          return (
            <>
              {start && (
                <Marker position={start} icon={createLabelIcon('Départ', '#16a34a')} interactive={false}>
                  <Popup><span className="font-semibold text-sm">Départ du tracé</span></Popup>
                </Marker>
              )}
              {end && (
                <Marker position={end} icon={createLabelIcon('Fin', '#dc2626')} interactive={false}>
                  <Popup><span className="font-semibold text-sm">Fin du tracé</span></Popup>
                </Marker>
              )}
            </>
          );
        })()}

        {/* Marqueurs des étapes */}
        {etapes.map((etape, index) => (
          <Marker 
            key={`${etape.id || `temp-${index}`}-${etape.order}-${activeEtapeId === etape.id}`}
            position={[etape.latitude, etape.longitude]}
            icon={createNumberedIcon(etape.order, !!(activeEtapeId && etape.id === activeEtapeId))}
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
