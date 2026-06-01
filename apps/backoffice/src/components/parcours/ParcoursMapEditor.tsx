'use client';

import { useState, useTransition, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Plus, MapPin, Upload, Trash2, Edit2, Save, X, GripVertical } from 'lucide-react';
import { updateParcours } from '@/src/services/parcours.service';
import type { Parcours, Etape } from '@/src/types/api.types';
import { gpx } from '@tmcw/togeojson';
import { cn } from '@/lib/utils';
import { createEtape, updateEtape, deleteEtape, reorderEtapes } from '@/src/services/etapes.service';

import JeuxManager from './JeuxManager';

// Chargement dynamique de la carte pour éviter les erreurs SSR de Leaflet
const MapLeaflet = dynamic(() => import('./MapLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-xl border border-border bg-muted/20 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-3 text-muted-foreground font-medium">Chargement de la carte...</span>
    </div>
  ),
});

interface ParcoursMapEditorProps {
  parcours: Parcours;
}

export default function ParcoursMapEditor({ parcours }: ParcoursMapEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [etapes, setEtapes] = useState<Etape[]>(parcours.etapes || []);
  const [pathGeoJSON, setPathGeoJSON] = useState<any>(
    parcours.pathGeoJSON ? JSON.parse(parcours.pathGeoJSON) : null
  );
  
  // State for the editor
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [editingEtape, setEditingEtape] = useState<Etape | Partial<Etape> | null>(null);
  const [draggedEtapeId, setDraggedEtapeId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGPXUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      startTransition(async () => {
        // Lire le fichier texte GPX
        const text = await file.text();
        // Parser le XML via le navigateur
        const dom = new DOMParser().parseFromString(text, 'text/xml');
        // Convertir en GeoJSON
        const converted = gpx(dom);
        
        // Sauvegarder dans la DB
        const geoJSONStr = JSON.stringify(converted);
        await updateParcours(parcours.id, { pathGeoJSON: geoJSONStr });
        
        setPathGeoJSON(converted);
        alert('Tracé GPX importé avec succès !');
      });
    } catch (err) {
      console.error(err);
      alert('Erreur lors du traitement du fichier GPX. Assurez-vous qu\'il est valide.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    // Si on est déjà en train d'éditer une étape, on met à jour ses coordonnées
    if (editingEtape) {
      setEditingEtape({ ...editingEtape, latitude: lat, longitude: lng });
    } else {
      // Sinon on prépare une nouvelle étape à cet endroit
      setSelectedLocation({ lat, lng });
      setEditingEtape({
        parcoursId: parcours.id,
        latitude: lat,
        longitude: lng,
        order: etapes.length + 1,
        title: `Nouvelle étape ${etapes.length + 1}`,
      });
    }
  };

  const saveEtape = async () => {
    if (!editingEtape) return;
    
    startTransition(async () => {
      try {
        if ('id' in editingEtape && editingEtape.id) {
          const { order, title, latitude, longitude, parcoursId } = editingEtape;
          const updated = await updateEtape(editingEtape.id, { order, title, latitude, longitude, parcoursId });
          setEtapes(prev => prev.map(e => e.id === updated.id ? updated : e));
        } else {
          // Create
          const created = await createEtape(editingEtape);
          setEtapes(prev => [...prev, created]);
        }
        setEditingEtape(null);
        setSelectedLocation(null);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'enregistrement de l'étape");
      }
    });
  };

  const handleDeleteEtape = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer cette étape ? Tous les mini-jeux associés seront également supprimés.')) return;
    
    startTransition(async () => {
      try {
        await deleteEtape(id);
        setEtapes(prev => prev.filter(e => e.id !== id));
        if (editingEtape && 'id' in editingEtape && editingEtape.id === id) {
          setEditingEtape(null);
        }
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression');
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedEtapeId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedEtapeId || draggedEtapeId === targetId) {
      setDraggedEtapeId(null);
      return;
    }

    const currentEtapes = [...etapes].sort((a, b) => a.order - b.order);
    const draggedIndex = currentEtapes.findIndex(et => et.id === draggedEtapeId);
    const targetIndex = currentEtapes.findIndex(et => et.id === targetId);

    if (draggedIndex < 0 || targetIndex < 0) {
      setDraggedEtapeId(null);
      return;
    }

    // Reorder locally
    const newEtapes = [...currentEtapes];
    const [draggedItem] = newEtapes.splice(draggedIndex, 1);
    newEtapes.splice(targetIndex, 0, draggedItem);

    // Update order values
    const updatedEtapes = newEtapes.map((etape, index) => ({
      ...etape,
      order: index + 1
    }));

    setEtapes(updatedEtapes);
    setDraggedEtapeId(null);

    // Update backend
    startTransition(async () => {
      try {
        await reorderEtapes(updatedEtapes.map(et => ({ id: et.id, order: et.order })));
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la sauvegarde du nouvel ordre.');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Colonne de Gauche : La Carte (2/3) */}
      <div className="lg:col-span-6 space-y-4">
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div>
            <h3 className="font-semibold text-lg">Carte du parcours</h3>
            <p className="text-sm text-muted-foreground">
              Cliquez sur la carte pour placer un point d'arrêt (étape).
            </p>
          </div>
          
          <div>
            <input 
              type="file" 
              accept=".gpx" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleGPXUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer un tracé (.GPX)
            </button>
          </div>
        </div>

        {/* Le conteneur de la carte */}
        <MapLeaflet 
          etapes={editingEtape ? [...etapes.filter(e => e.id !== (editingEtape as any).id), editingEtape as Etape] : etapes} 
          pathGeoJSON={pathGeoJSON} 
          onMapClick={handleMapClick}
          onMarkerClick={(etape) => setEditingEtape(etape)}
          activeEtapeId={(editingEtape as any)?.id ?? null}
        />
      </div>

      {/* Colonne de Droite : Gestionnaire d'Étapes (2/5) */}
      <div className="lg:col-span-6 space-y-4">
        {editingEtape ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="font-semibold">
                {'id' in editingEtape ? 'Modifier l\'étape' : 'Nouvelle étape'}
              </h3>
              <button 
                onClick={() => { setEditingEtape(null); setSelectedLocation(null); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titre de l'étape</label>
                <input 
                  type="text" 
                  value={editingEtape.title || ''} 
                  onChange={(e) => setEditingEtape({...editingEtape, title: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-primary flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> 
                  Coordonnées
                </label>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded flex justify-between">
                  <span>Lat: {editingEtape.latitude?.toFixed(5)}</span>
                  <span>Lng: {editingEtape.longitude?.toFixed(5)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Cliquez n'importe où sur la carte pour déplacer ce point.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={saveEtape}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex justify-center items-center gap-2"
                >
                  <Save className="h-4 w-4" /> Enregistrer l'étape
                </button>
              </div>

              {'id' in editingEtape && editingEtape.id ? (
                <JeuxManager 
                  etape={editingEtape as Etape} 
                  onUpdateEtape={(updatedEtape) => {
                    setEditingEtape(updatedEtape);
                    setEtapes(prev => prev.map(e => e.id === updatedEtape.id ? updatedEtape : e));
                  }} 
                />
              ) : (
                <div className="text-xs text-muted-foreground text-center mt-4 bg-muted/50 p-2 rounded-md">
                  Sauvegardez l'étape d'abord pour pouvoir y ajouter des mini-jeux.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col h-full max-h-[600px]">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-lg">Les Étapes ({etapes.length})</h3>
              <button 
                onClick={() => alert("Cliquez directement sur la carte pour ajouter une étape !")}
                className="h-8 w-8 bg-primary/10 text-primary rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
                title="Ajouter une étape"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {etapes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <MapPin className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">Aucune étape pour le moment.</p>
                  <p className="text-xs mt-1">Cliquez sur la carte pour commencer le tracé.</p>
                </div>
              ) : (
                etapes.sort((a, b) => a.order - b.order).map((etape) => (
                  <div 
                    key={etape.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, etape.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, etape.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border bg-background hover:border-primary/50 cursor-pointer transition-colors relative",
                      draggedEtapeId === etape.id ? "opacity-50 border-dashed border-primary" : "border-border"
                    )}
                    onClick={() => setEditingEtape(etape)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-2"
                        title="Glisser pour réorganiser"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {etape.order}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground line-clamp-1">{etape.title}</p>
                        <p className="text-xs text-muted-foreground">{etape.jeux?.length || 0} mini-jeu(x)</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => handleDeleteEtape(etape.id, e)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
