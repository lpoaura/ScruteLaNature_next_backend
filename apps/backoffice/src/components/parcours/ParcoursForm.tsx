'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { createParcours, updateParcours } from '@/src/services/parcours.service';
import { getZonages } from '@/src/services/zonages.service';
import { getMedias, uploadMedia } from '@/src/services/medias.service';
import { getOrganismes } from '@/src/services/organismes.service';
import { useAuth } from '@/src/hooks/use-auth';
import { useRoles } from '@/src/hooks/use-roles';
import type { Parcours, Zonage, Organisme, PublishStatus } from '@/src/types/api.types';
import type { Media } from '@/src/services/medias.service';
import { cn } from '@/lib/utils';
import ParcoursMapEditor from './ParcoursMapEditor';
import MediaGalleryModal from './MediaGalleryModal';

interface ParcoursFormProps {
  initialData?: Parcours;
  isEdit?: boolean;
}

export default function ParcoursForm({ initialData, isEdit = false }: ParcoursFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles(user);

  // Données de base de données pour les selects
  const [zonages, setZonages] = useState<Zonage[]>([]);
  const [organismes, setOrganismes] = useState<Organisme[]>([]);
  const [selectedOrganismeId, setSelectedOrganismeId] = useState<string>('');
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
        const fetches: Promise<any>[] = [getZonages(), getMedias()];
        if (isSuperAdmin) fetches.push(getOrganismes());

        const [zData, mData, orgData] = await Promise.all(fetches);
        setZonages(zData);
        setMedias(mData.filter((m: any) => m.mimetype.startsWith('image/')));

        if (isSuperAdmin && orgData) {
          setOrganismes(orgData);
          if (orgData.length > 0) setSelectedOrganismeId(orgData[0].id);
        }

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
  }, [isEdit, initialData, isSuperAdmin]);

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
    if (isSuperAdmin && !selectedOrganismeId) {
      setError('Veuillez sélectionner un organisme.');
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
          await createParcours(formData, isSuperAdmin ? selectedOrganismeId : undefined);
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
  const [gallerySearch, setGallerySearch] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'map'>('info');
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadInGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const uploaded = await uploadMedia(file, 'specific');
      // On ne l'ajoute plus à la liste locale des médias de la galerie puisque c'est spécifique
      
      // Auto-sélectionner l'image uploadée
      if (isGalleryOpen) {
        setFormData(prev => ({ 
          ...prev, 
          [isGalleryOpen === 'cover' ? 'coverImage' : 'mascotteImg']: uploaded.url 
        }));
        setIsGalleryOpen(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const filteredMedias = medias.filter(m => 
    m.originalName.toLowerCase().includes(gallerySearch.toLowerCase())
  );

  return (
    <>
      <div className="space-y-8 max-w-5xl mx-auto pb-10">
      
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
        
        {activeTab === 'info' && (
          <button
            type="submit"
            form="parcours-form"
            disabled={isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        )}
      </div>

      {isEdit && initialData && (
        <div className="flex space-x-4 border-b border-border">
          <button 
            onClick={() => setActiveTab('info')} 
            className={cn(
              "px-1 py-3 text-sm font-medium border-b-2 transition-colors", 
              activeTab === 'info' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Informations générales
          </button>
          <button 
            onClick={() => setActiveTab('map')} 
            className={cn(
              "px-1 py-3 text-sm font-medium border-b-2 transition-colors", 
              activeTab === 'map' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Tracé & Étapes
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {activeTab === 'info' ? (
        <form id="parcours-form" onSubmit={handleSubmit}>
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

                {isSuperAdmin && !isEdit && (
                  <div className="space-y-2">
                    <label htmlFor="organismeId" className="text-sm font-medium">
                      Organisme <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="organismeId"
                      value={selectedOrganismeId}
                      onChange={e => setSelectedOrganismeId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="" disabled>Sélectionner un organisme</option>
                      {organismes.map(o => (
                        <option key={o.id} value={o.id}>{o.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

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
      ) : (
        <ParcoursMapEditor parcours={initialData!} />
      )}
    </div>

      {/* Galerie Modale */}
      {isGalleryOpen && (
        <MediaGalleryModal 
          type="image"
          onClose={() => setIsGalleryOpen(null)}
          onSelect={(url) => {
            setFormData(prev => ({ 
              ...prev, 
              [isGalleryOpen === 'cover' ? 'coverImage' : 'mascotteImg']: url 
            }));
          }}
        />
      )}
    </>
  );
}
