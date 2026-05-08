'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Save, X, Edit2, Loader2, Image as ImageIcon, Music } from 'lucide-react';
import { createJeu, updateJeu, deleteJeu } from '@/src/services/jeux.service';
import type { Etape, Jeu, JeuType } from '@/src/types/api.types';
import MediaGalleryModal from './MediaGalleryModal';

interface JeuxManagerProps {
  etape: Etape;
  onUpdateEtape: (etape: Etape) => void;
}

export default function JeuxManager({ etape, onUpdateEtape }: JeuxManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [editingJeu, setEditingJeu] = useState<Jeu | Partial<Jeu> | null>(null);
  const [galleryType, setGalleryType] = useState<'image' | 'audio' | null>(null);
  
  const handleCreateNew = () => {
    setEditingJeu({
      etapeId: etape.id,
      order: (etape.jeux?.length || 0) + 1,
      type: 'INFO',
      question: 'Nouvelle information ou question',
      explication: '',
      donneesJeu: {},
      reponse: '',
    });
  };

  const handleSaveJeu = async () => {
    if (!editingJeu) return;
    
    startTransition(async () => {
      try {
        let savedJeu: Jeu;
        if ('id' in editingJeu && editingJeu.id) {
          savedJeu = await updateJeu(editingJeu.id, editingJeu);
        } else {
          savedJeu = await createJeu(editingJeu);
        }
        
        // Update local state
        const newJeux = etape.jeux ? [...etape.jeux] : [];
        const index = newJeux.findIndex(j => j.id === savedJeu.id);
        if (index >= 0) {
          newJeux[index] = savedJeu;
        } else {
          newJeux.push(savedJeu);
        }
        
        onUpdateEtape({ ...etape, jeux: newJeux });
        setEditingJeu(null);
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la sauvegarde du jeu.');
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce mini-jeu ?')) return;
    startTransition(async () => {
      try {
        await deleteJeu(id);
        const newJeux = (etape.jeux || []).filter(j => j.id !== id);
        onUpdateEtape({ ...etape, jeux: newJeux });
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression.');
      }
    });
  };

  // Helper for QCM
  const handleQcmChange = (index: number, value: string) => {
    if (!editingJeu) return;
    const options = editingJeu.donneesJeu?.options || ['', '', '', ''];
    options[index] = value;
    setEditingJeu({
      ...editingJeu,
      donneesJeu: { ...editingJeu.donneesJeu, options }
    });
  };

  const handleQcmCorrect = (index: number) => {
    if (!editingJeu) return;
    setEditingJeu({
      ...editingJeu,
      donneesJeu: { ...editingJeu.donneesJeu, bonneReponseIndex: index }
    });
  };

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Mini-jeux & Contenus 
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
            {etape.jeux?.length || 0}
          </span>
        </h3>
        {!editingJeu && (
          <button 
            onClick={handleCreateNew}
            className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        )}
      </div>

      {editingJeu ? (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h4 className="font-medium text-primary">
              {'id' in editingJeu && editingJeu.id ? 'Modifier le jeu' : 'Nouveau jeu'}
            </h4>
            <button onClick={() => setEditingJeu(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type de jeu/contenu</label>
              <select 
                value={editingJeu.type}
                onChange={(e) => setEditingJeu({ 
                  ...editingJeu, 
                  type: e.target.value as JeuType,
                  donneesJeu: {} // Reset JSON quand on change de type
                })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-primary outline-none"
              >
                <option value="INFO">Information simple (Texte/Audio)</option>
                <option value="QCM">QCM (Choix multiple)</option>
                <option value="CHARADE">Charade</option>
                <option value="CODE_CAESAR">Code César</option>
                <option value="VALIDATION_LIEU">Validation de Lieu (GPS)</option>
                <option value="ECO_GESTE">Éco-geste</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Question ou Texte principal
              </label>
              <textarea 
                rows={3}
                value={editingJeu.question || ''}
                onChange={(e) => setEditingJeu({...editingJeu, question: e.target.value})}
                placeholder="Ex: Quel oiseau voyez-vous ?"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-primary outline-none resize-none"
              />
            </div>

            {/* --- RENDU CONDITIONNEL SELON LE TYPE DE JEU --- */}
            
            {editingJeu.type === 'QCM' && (
              <div className="bg-card border border-border rounded-md p-3 space-y-3">
                <label className="text-xs font-medium text-primary block">Réponses du QCM</label>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="bonneReponse"
                      checked={editingJeu.donneesJeu?.bonneReponseIndex === i}
                      onChange={() => handleQcmCorrect(i)}
                      className="h-4 w-4 text-primary"
                    />
                    <input 
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={editingJeu.donneesJeu?.options?.[i] || ''}
                      onChange={(e) => handleQcmChange(i, e.target.value)}
                      className="flex-1 px-3 py-1 border border-input rounded bg-background text-sm focus:ring-primary outline-none"
                    />
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground mt-1">Cochez le bouton radio pour définir la bonne réponse.</p>
              </div>
            )}

            {editingJeu.type === 'CODE_CAESAR' && (
              <div className="bg-card border border-border rounded-md p-3 space-y-3">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-primary block mb-1">Mot à trouver (Réponse)</label>
                    <input 
                      type="text"
                      value={editingJeu.reponse || ''}
                      onChange={(e) => setEditingJeu({...editingJeu, reponse: e.target.value})}
                      placeholder="Ex: HIBOU"
                      className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm focus:ring-primary outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-primary block mb-1">Décalage (+N)</label>
                    <input 
                      type="number"
                      min="1" max="25"
                      value={editingJeu.donneesJeu?.decalage || 3}
                      onChange={(e) => setEditingJeu({
                        ...editingJeu, 
                        donneesJeu: { ...editingJeu.donneesJeu, decalage: parseInt(e.target.value) || 3 }
                      })}
                      className="w-20 px-3 py-1.5 border border-input rounded bg-background text-sm focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {(editingJeu.type === 'CHARADE' || editingJeu.type === 'ECO_GESTE') && (
              <div className="bg-card border border-border rounded-md p-3 space-y-3">
                <label className="text-xs font-medium text-primary block mb-1">Réponse attendue</label>
                <input 
                  type="text"
                  value={editingJeu.reponse || ''}
                  onChange={(e) => setEditingJeu({...editingJeu, reponse: e.target.value})}
                  className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm focus:ring-primary outline-none"
                />
              </div>
            )}

            {/* --- FIN RENDU CONDITIONNEL --- */}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Explication (Après avoir répondu / lu)
              </label>
              <textarea 
                rows={2}
                value={editingJeu.explication || ''}
                onChange={(e) => setEditingJeu({...editingJeu, explication: e.target.value})}
                placeholder="Ex: Le Héron cendré est très commun ici..."
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-primary outline-none resize-none"
              />
            </div>

            <div className="flex gap-4 pt-2">
               <div className="flex-1">
                 <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                   <ImageIcon className="h-3 w-3" /> Image d'illustration
                 </label>
                 {editingJeu.imageUrl ? (
                   <div className="relative group">
                     <img src={editingJeu.imageUrl} className="h-16 w-full object-cover rounded border border-border" />
                     <button onClick={() => setEditingJeu({...editingJeu, imageUrl: ''})} className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3"/></button>
                   </div>
                 ) : (
                   <button 
                     type="button"
                     onClick={() => setGalleryType('image')}
                     className="w-full flex items-center justify-center h-16 border-2 border-dashed border-border rounded cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground transition-colors"
                   >
                     Parcourir / Uploader
                   </button>
                 )}
               </div>

               <div className="flex-1">
                 <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                   <Music className="h-3 w-3" /> Audio (Voix mascotte)
                 </label>
                 {editingJeu.audioUrl ? (
                   <div className="h-16 bg-card border border-border rounded flex flex-col items-center justify-center p-2 relative group">
                     <span className="text-xs truncate max-w-[100px] text-primary font-medium">Audio chargé</span>
                     <button onClick={() => setEditingJeu({...editingJeu, audioUrl: ''})} className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3"/></button>
                   </div>
                 ) : (
                   <button 
                     type="button"
                     onClick={() => setGalleryType('audio')}
                     className="w-full flex items-center justify-center h-16 border-2 border-dashed border-border rounded cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground transition-colors"
                   >
                     Parcourir / Uploader
                   </button>
                 )}
               </div>
            </div>

            <button 
              onClick={handleSaveJeu}
              disabled={isPending}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex justify-center items-center gap-2 mt-4"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
              Enregistrer ce module
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {(etape.jeux || []).length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              Aucun mini-jeu ou info pour cette étape.
            </div>
          ) : (
            [...(etape.jeux || [])].sort((a, b) => a.order - b.order).map((jeu) => (
              <div key={jeu.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:border-primary/30 transition-colors">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {jeu.type}
                    </span>
                    <span className="text-sm font-medium text-foreground line-clamp-1 max-w-[200px]">
                      {jeu.question}
                    </span>
                  </div>
                  {(jeu.imageUrl || jeu.audioUrl) && (
                    <div className="flex gap-2 mt-1">
                      {jeu.imageUrl && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3"/> Image</span>}
                      {jeu.audioUrl && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Music className="h-3 w-3"/> Audio</span>}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingJeu(jeu)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(jeu.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {galleryType && (
        <MediaGalleryModal 
          type={galleryType}
          onClose={() => setGalleryType(null)}
          onSelect={(url) => {
            setEditingJeu(prev => {
              if (!prev) return prev;
              return { ...prev, [galleryType === 'image' ? 'imageUrl' : 'audioUrl']: url };
            });
          }}
        />
      )}
    </div>
  );
}
