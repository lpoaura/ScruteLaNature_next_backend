'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { createParcours, updateParcours } from '@/src/services/parcours.service';
import { getZonages } from '@/src/services/zonages.service';
import { getMedias } from '@/src/services/medias.service';
import type { Parcours, Zonage, PublishStatus } from '@/src/types/api.types';
import type { Media } from '@/src/services/medias.service';
import { cn } from '@/lib/utils';

interface ParcoursFormProps {
  initialData?: Parcours;
  isEdit?: boolean;
}

export default function ParcoursForm({ initialData, isEdit = false }: ParcoursFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Données de base de données pour les selects
  const [zonages, setZonages] = useState<Zonage[]>([]);
  const [medias, setMedias] = useState<Media[]>([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);

  // État du formulaire
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    difficulty: initialData?.difficulty || 'FACILE',
    distanceKm: initialData?.distanceKm || 0.1,
    durationMin: initialData?.durationMin || 30,
    zonageId: initialData?.zonageId || '',
    status: initialData?.status || 'DRAFT',
    coverImage: initialData?.coverImage || '',
    mascotteNom: initialData?.mascotteNom || '',
    mascotteImg: initialData?.mascotteImg || '',
    isPMRFriendly: initialData?.isPMRFriendly || false,
    isChildFriendly: initialData?.isChildFriendly || false,
    isMentalHandicapFriendly: initialData?.isMentalHandicapFriendly || false,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const [zData, mData] = await Promise.all([getZonages(), getMedias()]);
        setZonages(zData);
        // Filtrer uniquement les images pour la sélection
        setMedias(mData.filter(m => m.mimetype.startsWith('image/')));
        
        // Si c'est une création et qu'aucun zonage n'est sélectionné, prendre le premier par défaut
        if (!isEdit && !initialData?.zonageId && zData.length > 0) {
          setFormData(prev => ({ ...prev, zonageId: zData[0].id }));
        }
      } catch (err) {
        console.error('Erreur lors du chargement des références', err);
      } finally {
        setIsLoadingRefs(false);
      }
    };
    fetchRefs();
  }, [isEdit, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Gérer les cases à cocher
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    // Gérer les nombres
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations manuelles
    if (!formData.zonageId) {
      setError('Veuillez sélectionner un zonage.');
      return;
    }
    if (!formData.coverImage) {
      setError('L\'image de couverture est requise. Veuillez en sélectionner une depuis la médiathèque.');
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && initialData) {
          await updateParcours(initialData.id, formData);
        } else {
          await createParcours(formData);
        }
        router.push('/dashboard/parcours');
        router.refresh();
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Une erreur est survenue lors de l\'enregistrement.');
        }
      }
    });
  };

  const [isGalleryOpen, setIsGalleryOpen] = useState<'cover' | 'mascotte' | null>(null);

  if (isLoadingRefs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getPreviewUrl = (val: string) => {
    const m = medias.find(m => m.url === val || m.filename === val);
    return m?.url || (val.startsWith('http') ? val : null);
  };

  const ImagePicker = ({ 
    type, 
    label, 
    value, 
    required = false 
  }: { 
    type: 'cover' | 'mascotte', 
    label: string, 
    value: string,
    required?: boolean
  }) => {
    const previewUrl = getPreviewUrl(value);

    return (
      <div className="space-y-3">
        <label className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        
        <div className="aspect-video w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 relative group">
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Aperçu" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  type="button" 
                  onClick={() => setIsGalleryOpen(type)}
                  className="bg-white text-black px-3 py-1.5 rounded-md text-sm font-medium shadow-sm hover:bg-gray-100"
                >
                  Changer l'image
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <ImageIcon className="h-8 w-8 mb-2 opacity-30 text-muted-foreground" />
              <button 
                type="button" 
                onClick={() => setIsGalleryOpen(type)}
                className="text-sm text-primary font-medium hover:underline"
              >
                Parcourir la galerie
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-10">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/parcours"
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              {isEdit ? 'Modifier le parcours' : 'Créer un parcours'}
            </h1>
          </div>
          
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Colonne de gauche (2/3) : Informations principales */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold border-b border-border pb-3">Informations générales</h2>
              
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">Titre du parcours <span className="text-destructive">*</span></label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  maxLength={200}
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: La forêt des oiseaux"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">Description complète <span className="text-destructive">*</span></label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={5}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Décrivez ce que les visiteurs vont découvrir..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="zonageId" className="text-sm font-medium">Zonage associé <span className="text-destructive">*</span></label>
                  <select
                    id="zonageId"
                    name="zonageId"
                    required
                    value={formData.zonageId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="" disabled>Sélectionner un zonage</option>
                    {zonages.map(z => (
                      <option key={z.id} value={z.id}>{z.nom} ({z.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium">Statut de publication</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="DRAFT">Brouillon (invisible)</option>
                    <option value="PUBLISHED">Publié (visible dans l'app)</option>
                    <option value="ARCHIVED">Archivé</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section Mascotte */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold border-b border-border pb-3">Mascotte du parcours</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="mascotteNom" className="text-sm font-medium">Nom de la mascotte</label>
                  <input
                    id="mascotteNom"
                    name="mascotteNom"
                    type="text"
                    maxLength={100}
                    value={formData.mascotteNom}
                    onChange={handleChange}
                    placeholder="Ex: Hector le Castor"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <ImagePicker 
                  type="mascotte" 
                  label="Image de la mascotte" 
                  value={formData.mascotteImg} 
                />
              </div>
            </div>
          </div>

          {/* Colonne de droite (1/3) : Paramètres techniques & Visuels */}
          <div className="space-y-6">
            
            {/* Image de couverture */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-3">Visuel</h2>
              
              <ImagePicker 
                type="cover" 
                label="Image de couverture" 
                value={formData.coverImage} 
                required 
              />
              <p className="text-[11px] text-muted-foreground pt-1">
                L'image doit d'abord être uploadée dans l'onglet Médiathèque.
              </p>
            </div>

            {/* Paramètres d'activité */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-3">Données de l'activité</h2>
              
              <div className="space-y-2">
                <label htmlFor="difficulty" className="text-sm font-medium">Difficulté</label>
                <div className="flex gap-2">
                  {['FACILE', 'MOYEN', 'DIFFICILE'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, difficulty: diff as any }))}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors",
                        formData.difficulty === diff 
                          ? "bg-primary text-primary-foreground border-primary" 
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      )}
                    >
                      {diff.charAt(0) + diff.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label htmlFor="distanceKm" className="text-sm font-medium">Distance (km)</label>
                  <input
                    id="distanceKm"
                    name="distanceKm"
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={formData.distanceKm}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none text-center font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="durationMin" className="text-sm font-medium">Durée (min)</label>
                  <input
                    id="durationMin"
                    name="durationMin"
                    type="number"
                    step="5"
                    min="5"
                    required
                    value={formData.durationMin}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none text-center font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Accessibilité */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-3">Accessibilité</h2>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
                  <input
                    type="checkbox"
                    name="isPMRFriendly"
                    checked={formData.isPMRFriendly}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Adapté PMR</span>
                </label>

                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
                  <input
                    type="checkbox"
                    name="isChildFriendly"
                    checked={formData.isChildFriendly}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Adapté aux enfants</span>
                </label>

                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
                  <input
                    type="checkbox"
                    name="isMentalHandicapFriendly"
                    checked={formData.isMentalHandicapFriendly}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Adapté handicap mental</span>
                </label>
              </div>
            </div>

          </div>
        </div>
      </form>

      {/* Galerie Modale */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold text-lg text-foreground">
                Choisir une image pour {isGalleryOpen === 'cover' ? 'la couverture' : 'la mascotte'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsGalleryOpen(null)} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                Fermer
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-muted/20">
              {medias.length === 0 ? (
                <div className="col-span-full py-16 text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Aucune image disponible.</p>
                  <Link href="/dashboard/medias" className="text-primary hover:underline mt-2 inline-block">
                    Aller à la médiathèque pour en ajouter
                  </Link>
                </div>
              ) : (
                medias.map(m => {
                  const currentValue = isGalleryOpen === 'cover' ? formData.coverImage : formData.mascotteImg;
                  const isSelected = currentValue === m.url;
                  
                  return (
                    <button
                      key={m.filename}
                      type="button"
                      onClick={() => { 
                        setFormData(prev => ({ 
                          ...prev, 
                          [isGalleryOpen === 'cover' ? 'coverImage' : 'mascotteImg']: m.url 
                        }));
                        setIsGalleryOpen(null); 
                      }}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2 transition-all relative group bg-background shadow-sm",
                        isSelected 
                          ? "border-primary ring-4 ring-primary/20" 
                          : "border-transparent hover:border-primary/50"
                      )}
                    >
                      <img src={m.url} alt={m.originalName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Sélectionner</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {isGalleryOpen === 'mascotte' && formData.mascotteImg && (
              <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                <button 
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, mascotteImg: '' }));
                    setIsGalleryOpen(null);
                  }}
                  className="text-sm text-destructive hover:underline font-medium px-4 py-2"
                >
                  Retirer l'image de la mascotte
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
