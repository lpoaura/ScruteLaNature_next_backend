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

  if (isLoadingRefs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Prévisualisation de l'image de couverture sélectionnée
  const selectedCoverMedia = medias.find(m => m.url === formData.coverImage || m.filename === formData.coverImage);
  const coverPreviewUrl = selectedCoverMedia?.url || (formData.coverImage.startsWith('http') ? formData.coverImage : null);

  return (
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
                    <option key={z.id} value={z.id}>{z.nom} ({z.codePostal})</option>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <label htmlFor="mascotteImg" className="text-sm font-medium">Image de la mascotte</label>
                <select
                  id="mascotteImg"
                  name="mascotteImg"
                  value={formData.mascotteImg}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">Aucune image</option>
                  {medias.map(m => (
                    <option key={m.filename} value={m.url}>{m.originalName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne de droite (1/3) : Paramètres techniques & Visuels */}
        <div className="space-y-6">
          
          {/* Image de couverture */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b border-border pb-3">Visuel</h2>
            <div className="space-y-3">
              <label htmlFor="coverImage" className="text-sm font-medium">Image de couverture <span className="text-destructive">*</span></label>
              
              <div className="aspect-video w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground p-4 text-center">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-xs">Aucune image sélectionnée</span>
                  </div>
                )}
              </div>

              <select
                id="coverImage"
                name="coverImage"
                required
                value={formData.coverImage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none text-sm"
              >
                <option value="" disabled>Choisir dans la médiathèque...</option>
                {medias.map(m => (
                  <option key={m.filename} value={m.url}>{m.originalName}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                L'image doit d'abord être uploadée dans l'onglet Médiathèque.
              </p>
            </div>
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
  );
}
