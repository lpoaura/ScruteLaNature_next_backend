'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Plus, MapPin, Upload, Trash2, Edit2, Save, X, GripVertical, Route, HelpCircle, ChevronUp, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { getParcoursById, updateParcours } from '@/src/services/parcours.service';
import type { Parcours, Etape } from '@/src/types/api.types';
import { gpx } from '@tmcw/togeojson';
import { cn } from '@/lib/utils';
import { createEtape, updateEtape, deleteEtape, reorderEtapes } from '@/src/services/etapes.service';
import { updateJeu } from '@/src/services/jeux.service';

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
  onUpdate?: (parcours: Parcours) => void;
}

export default function ParcoursMapEditor({ parcours, onUpdate }: ParcoursMapEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [etapes, setEtapes] = useState<Etape[]>(parcours.etapes || []);
  const [pathGeoJSON, setPathGeoJSON] = useState<any>(
    parcours.pathGeoJSON ? JSON.parse(parcours.pathGeoJSON) : null
  );
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // State for the editor
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [editingEtape, setEditingEtape] = useState<Etape | Partial<Etape> | null>(null);
  const [draggedEtapeId, setDraggedEtapeId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasLoadedFresh, setHasLoadedFresh] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);

  // Recharger les données fraîches depuis le serveur à chaque montage
  // Cela garantit que les données sont à jour après un changement d'onglet
  useEffect(() => {
    let cancelled = false;
    async function reload() {
      setIsLoadingData(true);
      try {
        const fresh = await getParcoursById(parcours.id);
        if (cancelled) return;
        setEtapes(fresh.etapes || []);
        setPathGeoJSON(fresh.pathGeoJSON ? JSON.parse(fresh.pathGeoJSON) : null);
        setHasLoadedFresh(true);
      } catch (err) {
        console.error('Erreur lors du rechargement des données du parcours:', err);
        // Fallback: utiliser les données du prop
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }
    reload();
    return () => { cancelled = true; };
  }, [parcours.id]);

  const generateRouteForEtapes = async (etapesList: Etape[], skipConfirm = false) => {
    if (etapesList.length < 2) {
      if (!skipConfirm) alert("Il faut au moins 2 étapes pour générer un tracé.");
      return;
    }

    if (!skipConfirm && pathGeoJSON && !confirm("Un tracé existe déjà. Voulez-vous l'écraser avec un tracé généré automatiquement ?")) {
      return;
    }

    setIsGenerating(true);
    try {
      const sortedEtapes = [...etapesList].sort((a, b) => a.order - b.order);
      const coordsString = sortedEtapes.map(e => `${e.longitude},${e.latitude}`).join(';');
      
      const response = await fetch(`https://router.project-osrm.org/route/v1/foot/${coordsString}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error("Erreur de l'API OSRM");

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error("Impossible de trouver un chemin piéton entre ces étapes sur la carte OpenStreetMap.");
      }

      const geometry = data.routes[0].geometry;

      const featureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "Tracé généré automatiquement" },
            geometry: geometry
          }
        ]
      };

      const geoJSONStr = JSON.stringify(featureCollection);
      await updateParcours(parcours.id, { pathGeoJSON: geoJSONStr });
      
      setPathGeoJSON(featureCollection);
      if (!skipConfirm) alert('Tracé généré avec succès !');

    } catch (err: any) {
      console.error(err);
      if (!skipConfirm) alert(err.message || 'Erreur lors de la génération du tracé.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRoute = () => generateRouteForEtapes(etapes, false);

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
        let newEtapesList = [...etapes];

        if ('id' in editingEtape && editingEtape.id) {
          const { order, title, latitude, longitude, parcoursId } = editingEtape;
          const updated = await updateEtape(editingEtape.id, { order, title, latitude, longitude, parcoursId });
          newEtapesList = newEtapesList.map(e => e.id === updated.id ? updated : e);
          setEtapes(newEtapesList);
        } else {
          // Create
          const created = await createEtape(editingEtape);
          newEtapesList = [...newEtapesList, created];
          setEtapes(newEtapesList);
        }
        setEditingEtape(null);
        setSelectedLocation(null);

        // Régénérer automatiquement le tracé si c'était un tracé auto
        const isAutoRoute = pathGeoJSON?.features?.[0]?.properties?.name === "Tracé généré automatiquement";
        
        if (isAutoRoute && newEtapesList.length >= 2) {
          generateRouteForEtapes(newEtapesList, true);
        }

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
        const filteredEtapes = etapes.filter(e => e.id !== id);
        setEtapes(filteredEtapes);
        if (editingEtape && 'id' in editingEtape && editingEtape.id === id) {
          setEditingEtape(null);
        }

        // Régénérer automatiquement le tracé si c'était un tracé auto
        const isAutoRoute = pathGeoJSON?.features?.[0]?.properties?.name === "Tracé généré automatiquement";
        if (isAutoRoute && filteredEtapes.length >= 2) {
          generateRouteForEtapes(filteredEtapes, true);
        } else if (isAutoRoute && filteredEtapes.length < 2) {
          // S'il reste moins de 2 étapes, le tracé auto n'est plus valide, on le supprime
          await updateParcours(parcours.id, { pathGeoJSON: null });
          setPathGeoJSON(null);
        }
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression');
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    isDragging.current = true;
    setDraggedEtapeId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedEtapeId(null);
    // Delay reset so onClick can check isDragging
    setTimeout(() => { isDragging.current = false; }, 0);
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

    // Régénérer automatiquement le tracé si c'était un tracé auto
    const isAutoRoute = pathGeoJSON?.features?.[0]?.properties?.name === "Tracé généré automatiquement";
    if (isAutoRoute) {
      generateRouteForEtapes(updatedEtapes, true);
    }

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

  const moveEtape = (etapeId: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentEtapes = [...etapes].sort((a, b) => a.order - b.order);
    const index = currentEtapes.findIndex(et => et.id === etapeId);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentEtapes.length - 1) return;

    const newEtapes = [...currentEtapes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newEtapes[index];
    newEtapes[index] = newEtapes[targetIndex];
    newEtapes[targetIndex] = temp;

    // Update order values
    const updatedEtapes = newEtapes.map((etape, i) => ({
      ...etape,
      order: i + 1
    }));

    setEtapes(updatedEtapes);

    const isAutoRoute = pathGeoJSON?.features?.[0]?.properties?.name === "Tracé généré automatiquement";
    if (isAutoRoute) {
      generateRouteForEtapes(updatedEtapes, true);
    }

    startTransition(async () => {
      try {
        await reorderEtapes(updatedEtapes.map(et => ({ id: et.id, order: et.order })));
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la sauvegarde du nouvel ordre.');
      }
    });
  };

  const swapContent = (etapeId: string, direction: 'next' | 'prev', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentEtapes = [...etapes].sort((a, b) => a.order - b.order);
    const index = currentEtapes.findIndex(et => et.id === etapeId);
    if (index < 0) return;
    if (direction === 'prev' && index === 0) return;
    if (direction === 'next' && index === currentEtapes.length - 1) return;

    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    const etape1 = currentEtapes[index];
    const etape2 = currentEtapes[targetIndex];

    // Swap locally: garder les lat/lng, n'echanger que titre, description et jeux
    const newEtapes = currentEtapes.map(e => {
      if (e.id === etape1.id) {
        return {
          ...e,
          title: etape2.title,
          description: etape2.description,
          jeux: (etape2.jeux ?? []).map(j => ({ ...j, etapeId: etape1.id })),
        };
      }
      if (e.id === etape2.id) {
        return {
          ...e,
          title: etape1.title,
          description: etape1.description,
          jeux: (etape1.jeux ?? []).map(j => ({ ...j, etapeId: etape2.id })),
        };
      }
      return e;
    });

    setEtapes(newEtapes);

    // Persister en base
    startTransition(async () => {
      try {
        await Promise.all([
          // Echanger les champs texte
          updateEtape(etape1.id, { title: etape2.title, description: etape2.description }),
          updateEtape(etape2.id, { title: etape1.title, description: etape1.description }),
          // Reassigner les jeux de l'etape1 vers etape2
          ...(etape1.jeux ?? []).map(j => updateJeu(j.id, { etapeId: etape2.id })),
          // Reassigner les jeux de l'etape2 vers etape1
          ...(etape2.jeux ?? []).map(j => updateJeu(j.id, { etapeId: etape1.id })),
        ]);
      } catch (err) {
        console.error(err);
        alert('Erreur lors de l\'inversion du contenu.');
      }
    });
  };


  if (!hasLoadedFresh && isLoadingData) {
    return (
      <div className="h-[600px] w-full rounded-xl border border-border bg-muted/20 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <span className="text-muted-foreground font-medium">Actualisation des données du parcours...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Colonne de Gauche : La Carte (2/3) */}
      <div className="lg:col-span-6 space-y-4">
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div>
            <h3 className="font-semibold text-lg">Carte du parcours</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Cliquez sur la carte pour placer un point d'arrêt (étape).<br/>
              <span className="text-xs">Besoin de dessiner un tracé complexe ? <a href="https://www.visorando.com/logiciel-randonnee.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Créer un fichier GPX avec Visorando</a>.</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateRoute}
              disabled={isGenerating || isPending || etapes.length < 2}
              className="flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              title={etapes.length < 2 ? "Placez au moins 2 étapes sur la carte" : "Générer automatiquement le chemin piéton entre les étapes"}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
              Générer auto
            </button>
            <input 
              type="file" 
              accept=".gpx" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleGPXUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending || isGenerating}
              className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer .GPX
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
                  disabled={isPending}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                  {isPending ? 'Enregistrement...' : 'Enregistrer l\'étape'}
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
              <div className="relative group">
                <button 
                  type="button"
                  className="h-8 w-8 text-muted-foreground rounded-full flex items-center justify-center hover:bg-muted transition-colors cursor-help"
                  aria-label="Comment ajouter une étape"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
                
                <div className="absolute right-0 top-full mt-2 w-56 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-md border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  <span className="font-semibold block mb-1">Ajouter une étape</span>
                  Cliquez directement sur la carte pour y placer un nouveau point d'arrêt.
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {etapes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <MapPin className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">Aucune étape pour le moment.</p>
                  <p className="text-xs mt-1">Cliquez sur la carte pour commencer le tracé.</p>
                </div>
              ) : (
                [...etapes].sort((a, b) => a.order - b.order).map((etape, index) => (
                  <div 
                    key={etape.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, etape.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, etape.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border bg-background hover:border-primary/50 cursor-pointer transition-colors relative",
                      draggedEtapeId === etape.id ? "opacity-50 border-dashed border-primary" : "border-border"
                    )}
                    onClick={() => {
                      if (isDragging.current) return;
                      setEditingEtape(etape);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1"
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
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => swapContent(etape.id, 'next', e)}
                        className="text-muted-foreground hover:text-primary p-1 disabled:opacity-30 disabled:hover:text-muted-foreground"
                        disabled={index === etapes.length - 1}
                        title="Échanger le contenu (titre + mini-jeux) avec l'étape suivante, sans bouger les points sur la carte"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteEtape(etape.id, e)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
