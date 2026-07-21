'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Save, X, Edit2, Loader2, Image as ImageIcon, Music, Type } from 'lucide-react';
import { createJeu, updateJeu, deleteJeu } from '@/src/services/jeux.service';
import type { Etape, Jeu, JeuType } from '@/src/types/api.types';
import MediaGalleryModal from './MediaGalleryModal';
type QcmMode = 'text' | 'image' | 'audio';

interface QcmMediaPicker {
  index: number;
  mediaType: 'image' | 'audio';
}

function generatePyramid(target: number, levels: number = 4) {
  if (levels === 3) {
    if (target < 4) target = 4;
    
    let maxB1 = Math.floor((target - 2) / 2);
    if (maxB1 < 1) maxB1 = 1;
    let b1 = Math.floor(Math.random() * maxB1) + 1;
    
    let maxB0 = target - 2 * b1 - 1;
    if (maxB0 < 1) maxB0 = 1;
    let b0 = Math.floor(Math.random() * maxB0) + 1;
    
    let b2 = target - 2 * b1 - b0;
    if (b2 < 1) {
       b0 = 1; b1 = 1; b2 = target - 3;
       if (b2 < 1) b2 = 1;
    }
    
    const r2 = [b0, b1, b2];
    const r1 = [r2[0] + r2[1], r2[1] + r2[2]];
    const r0 = [r1[0] + r1[1]];
    
    const fullGrid = [r0, r1, r2];
    const pattern = Math.random() > 0.5 ? 1 : 2;
    
    const grille = fullGrid.map((row, rIdx) => 
      row.map((val, cIdx) => {
        if (rIdx === 0 && cIdx === 0) return val; // Sommet
        if (pattern === 1) {
          if (rIdx === 2 && cIdx === 0) return val;
          if (rIdx === 2 && cIdx === 2) return val;
        } else {
          if (rIdx === 1 && cIdx === 0) return val;
          if (rIdx === 2 && cIdx === 2) return val;
        }
        return null;
      })
    );
    return { grille, fullGrid };
  }

  // Default: 4 levels
  if (target < 8) target = 8;
  
  let b1 = Math.floor(Math.random() * Math.floor((target - 5) / 3)) + 1;
  if (b1 < 1) b1 = 1;
  let maxB2 = Math.floor((target - 3 * b1 - 2) / 3);
  if (maxB2 < 1) maxB2 = 1;
  let b2 = Math.floor(Math.random() * maxB2) + 1;
  let maxB0 = target - 3 * b1 - 3 * b2 - 1;
  if (maxB0 < 1) maxB0 = 1;
  let b0 = Math.floor(Math.random() * maxB0) + 1;
  let b3 = target - 3 * b1 - 3 * b2 - b0;
  
  if (b3 < 1) {
    b0 = 1; b1 = 1; b2 = 1; b3 = target - 5;
    if (b3 < 1) b3 = 1; // Failsafe
  }
  
  const r3 = [b0, b1, b2, b3];
  const r2 = [b0 + b1, b1 + b2, b2 + b3];
  const r1 = [r2[0] + r2[1], r2[1] + r2[2]];
  const r0 = [r1[0] + r1[1]];
  
  const fullGrid = [r0, r1, r2, r3];
  const pattern = Math.random() > 0.5 ? 1 : 2;
  
  const grille = fullGrid.map((row, rIdx) => 
    row.map((val, cIdx) => {
      if (rIdx === 0 && cIdx === 0) return val; // Sommet
      if (pattern === 1) {
        if (rIdx === 2 && cIdx === 0) return val;
        if (rIdx === 3 && cIdx === 0) return val;
        if (rIdx === 3 && cIdx === 2) return val;
        if (rIdx === 3 && cIdx === 3) return val; // Un chiffre en plus
      } else {
        if (rIdx === 2 && cIdx === 2) return val;
        if (rIdx === 3 && cIdx === 1) return val;
        if (rIdx === 3 && cIdx === 3) return val;
        if (rIdx === 3 && cIdx === 0) return val; // Un chiffre en plus
      }
      return null;
    })
  );
  
  return { grille, fullGrid };
}

function cipherCaesar(text: string, shift: number): string {
  if (!text) return '';
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const normalized = normalize(text);
  let result = '';
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    if (c >= 65 && c <= 90) {
      const shifted = ((c - 65 + shift) % 26 + 26) % 26 + 65;
      result += String.fromCharCode(shifted);
    } else {
      result += normalized.charAt(i);
    }
  }
  return result;
}

interface JeuxManagerProps {
  etape: Etape;
  onUpdateEtape: (etape: Etape) => void;
}

export default function JeuxManager({ etape, onUpdateEtape }: JeuxManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [editingJeu, setEditingJeu] = useState<Jeu | Partial<Jeu> | null>(null);
  const [galleryType, setGalleryType] = useState<'image' | 'audio' | null>(null);
  const [qcmMediaPicker, setQcmMediaPicker] = useState<QcmMediaPicker | null>(null);

  const handleCreateNew = () => {
    setEditingJeu({
      etapeId: etape.id,
      order: (etape.jeux?.length || 0) + 1,
      type: 'INFO',
      question: '',
      explication: '',
      donneesJeu: {},
      reponse: '',
    });
  };

  const handleSaveJeu = async () => {
    if (!editingJeu) return;
    
    // Validation QCM
    if (editingJeu.type === 'QCM') {
      const { options, bonneReponseIndex } = editingJeu.donneesJeu || {};
      if (!options || options.length !== 4 || options.some((opt: string) => !opt || opt.trim() === '')) {
        alert("Veuillez renseigner les 4 éléments du QCM.");
        return;
      }
      if (bonneReponseIndex === null || bonneReponseIndex === undefined) {
        alert("Veuillez choisir une bonne réponse parmi les 4 éléments.");
        return;
      }
    }

    startTransition(async () => {
      try {
        let payloadToSave = { ...editingJeu };
        // Si c'est un code césar, on s'assure que la phrase chiffrée est bien générée avant de sauvegarder
        if (payloadToSave.type === 'CODE_CAESAR') {
          const shift = payloadToSave.donneesJeu?.decalage ?? 3;
          payloadToSave.donneesJeu = {
            ...payloadToSave.donneesJeu,
            decalage: shift,
            phraseChiffree: cipherCaesar(payloadToSave.reponse || '', shift)
          };
        }

        let savedJeu: Jeu;
        if ('id' in payloadToSave && payloadToSave.id) {
          const { id, etapeId, createdAt, updatedAt, etape, ...payload } = payloadToSave as any;
          savedJeu = await updateJeu(id, payload);
        } else {
          savedJeu = await createJeu(payloadToSave);
        }
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
        onUpdateEtape({ ...etape, jeux: (etape.jeux || []).filter(j => j.id !== id) });
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression.');
      }
    });
  };

  // ── QCM helpers ────────────────────────────────────────────────────────────
  const handleQcmTextChange = (index: number, value: string) => {
    if (!editingJeu) return;
    const options = [...(editingJeu.donneesJeu?.options || ['', '', '', ''])];
    options[index] = value;
    setEditingJeu({ ...editingJeu, donneesJeu: { ...editingJeu.donneesJeu, options } });
  };

  const handleQcmCorrect = (index: number) => {
    if (!editingJeu) return;
    setEditingJeu({ ...editingJeu, donneesJeu: { ...editingJeu.donneesJeu, bonneReponseIndex: index } });
  };

  const handleQcmModeChange = (mode: QcmMode) => {
    if (!editingJeu) return;
    setEditingJeu({
      ...editingJeu,
      donneesJeu: { qcmType: mode, options: ['', '', '', ''], bonneReponseIndex: null },
    });
  };

  const handleQcmMediaSelect = (url: string) => {
    if (!editingJeu || !qcmMediaPicker) return;
    const options = [...(editingJeu.donneesJeu?.options || ['', '', '', ''])];
    options[qcmMediaPicker.index] = url;
    setEditingJeu({ ...editingJeu, donneesJeu: { ...editingJeu.donneesJeu, options } });
    setQcmMediaPicker(null);
  };

  // ── Indices helpers ────────────────────────────────────────────────────────
  const MAX_INDICES = 3;

  const handleIndiceChange = (index: number, value: string) => {
    if (!editingJeu) return;
    const indices = [...(editingJeu.donneesJeu?.indices || [])];
    indices[index] = value;
    setEditingJeu({ ...editingJeu, donneesJeu: { ...editingJeu.donneesJeu, indices } });
  };

  const handleAddIndice = () => {
    if (!editingJeu) return;
    const indices = [...(editingJeu.donneesJeu?.indices || [])];
    if (indices.length >= MAX_INDICES) return;
    indices.push('');
    setEditingJeu({ ...editingJeu, donneesJeu: { ...editingJeu.donneesJeu, indices } });
  };

  const handleRemoveIndice = (index: number) => {
    if (!editingJeu) return;
    const indices = [...(editingJeu.donneesJeu?.indices || [])].filter((_, i) => i !== index);
    setEditingJeu({ ...editingJeu, donneesJeu: { ...editingJeu.donneesJeu, indices } });
  };

  // ── Render QCM options bloc ────────────────────────────────────────────────
  const renderQcmOptions = () => {
    if (!editingJeu || editingJeu.type !== 'QCM') return null;
    const qcmMode: QcmMode = editingJeu.donneesJeu?.qcmType || 'text';
    const options: string[] = editingJeu.donneesJeu?.options || ['', '', '', ''];
    const optionsCaptions: string[] = editingJeu.donneesJeu?.optionsCaptions || ['', '', '', ''];
    const bonneReponseIndex: number | null = editingJeu.donneesJeu?.bonneReponseIndex ?? null;

    const handleQcmCaptionChange = (index: number, val: string) => {
      const newCaptions = [...optionsCaptions];
      newCaptions[index] = val;
      setEditingJeu({ ...editingJeu, donneesJeu: { ...editingJeu.donneesJeu, optionsCaptions: newCaptions } });
    };

    return (
      <div className="bg-card border border-border rounded-md p-3 space-y-4">

        {/* Sélecteur de mode */}
        <div>
          <label className="text-xs font-medium text-primary block mb-2">Type de réponses</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { mode: 'text' as QcmMode,  icon: <Type className="h-4 w-4" />, label: 'Texte' },
              { mode: 'image' as QcmMode, icon: <ImageIcon className="h-4 w-4" />, label: 'Images' },
              { mode: 'audio' as QcmMode, icon: <Music className="h-4 w-4" />, label: 'Audio' },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleQcmModeChange(mode)}
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  qcmMode === mode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 options */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-primary block">Options (cochez la bonne réponse)</label>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="radio"
                name="bonneReponse"
                checked={bonneReponseIndex === i}
                onChange={() => handleQcmCorrect(i)}
                className="h-4 w-4 shrink-0 accent-primary"
              />

              {/* Texte */}
              {qcmMode === 'text' && (
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={options[i] || ''}
                  onChange={(e) => handleQcmTextChange(i, e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-input rounded bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}

              {/* Image */}
              {qcmMode === 'image' && (
                options[i] ? (
                  <div className="flex-1 space-y-2">
                    <div className="relative group">
                      <img
                        src={options[i]}
                        alt={`Option ${i + 1}`}
                        className="h-16 w-full object-cover rounded border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => handleQcmTextChange(i, '')}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Légende (Optionnelle)"
                      value={optionsCaptions[i] || ''}
                      onChange={(e) => handleQcmCaptionChange(i, e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-input rounded bg-background outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQcmMediaPicker({ index: i, mediaType: 'image' })}
                    className="flex-1 h-16 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" /> Choisir une image
                  </button>
                )
              )}

              {/* Audio */}
              {qcmMode === 'audio' && (
                options[i] ? (
                  <div className="flex-1 space-y-2">
                    <div className="relative bg-card border border-border rounded px-3 py-2 flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary shrink-0" />
                      <audio controls src={options[i]} className="flex-1 h-8" />
                      <button
                        type="button"
                        onClick={() => handleQcmTextChange(i, '')}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Légende (Optionnelle)"
                      value={optionsCaptions[i] || ''}
                      onChange={(e) => handleQcmCaptionChange(i, e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-input rounded bg-background outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQcmMediaPicker({ index: i, mediaType: 'audio' })}
                    className="flex-1 h-16 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Music className="h-4 w-4" /> Choisir un audio
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Cochez le bouton radio à gauche pour définir la bonne réponse.
        </p>
      </div>
    );
  };

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Mini-jeux &amp; Contenus
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
            {/* Type de jeu */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type de jeu/contenu</label>
              <select
                value={editingJeu.type}
                onChange={(e) => {
                  const type = e.target.value as JeuType;
                  let donneesJeu: any = {};
                  if (type === 'CALCUL_PYRAMIDAL') {
                    donneesJeu = { targetResult: 50, ...generatePyramid(50) };
                  }
                  setEditingJeu({
                    ...editingJeu,
                    type,
                    donneesJeu,
                  });
                }}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-primary"
              >
                <option value="INFO">Information simple (Texte/Audio)</option>
                <option value="QCM">QCM (Choix multiple)</option>
                <option value="CHARADE">Charade</option>
                <option value="CODE_CAESAR">Code César</option>
                <option value="CALCUL_PYRAMIDAL">Calcul Pyramidal</option>
                <option value="PUZZLE">Puzzle (photo à reconstituer)</option>
                <option value="ECO_GESTE">Éco-geste</option>
              </select>
            </div>

            {/* Titre personnalisé */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Titre personnalisé (Optionnel)
              </label>
              <input
                type="text"
                value={editingJeu.titre || ''}
                onChange={(e) => setEditingJeu({ ...editingJeu, titre: e.target.value })}
                placeholder="Ex: Attention Spéciale ! (Par défaut: 'Le saviez-vous ?' ou nom du jeu)"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-primary outline-none"
              />
            </div>

            {/* Question */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Question ou Texte principal
              </label>
              <textarea
                rows={10}
                value={editingJeu.question || ''}
                onChange={(e) => setEditingJeu({ ...editingJeu, question: e.target.value })}
                placeholder="Ex: Quel oiseau voyez-vous ?"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-primary outline-none resize-none"
              />
            </div>

            {/* ── QCM avec 3 modes ── */}
            {editingJeu.type === 'QCM' && renderQcmOptions()}

            {/* ── Code César ── */}
            {editingJeu.type === 'CODE_CAESAR' && (
              <div className="bg-card border border-border rounded-md p-3 space-y-3">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-primary block mb-1">Mot à trouver (Réponse)</label>
                    <input
                      type="text"
                      value={editingJeu.reponse || ''}
                      onChange={(e) => {
                        const newReponse = e.target.value.toUpperCase();
                        const shift = editingJeu.donneesJeu?.decalage ?? 3;
                        setEditingJeu({ 
                          ...editingJeu, 
                          reponse: newReponse,
                          donneesJeu: {
                            ...editingJeu.donneesJeu,
                            decalage: shift,
                            phraseChiffree: cipherCaesar(newReponse, shift)
                          }
                        });
                      }}
                      placeholder="Ex: HIBOU"
                      className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-primary block mb-1">Décalage (+/- N)</label>
                    <input
                      type="number"
                      min="-25" max="25"
                      value={editingJeu.donneesJeu?.decalage ?? 3}
                      onChange={(e) => {
                        const shift = parseInt(e.target.value) || 0;
                        setEditingJeu({
                          ...editingJeu,
                          donneesJeu: { 
                            ...editingJeu.donneesJeu, 
                            decalage: shift,
                            phraseChiffree: cipherCaesar(editingJeu.reponse || '', shift)
                          },
                        });
                      }}
                      className="w-20 px-3 py-1.5 border border-input rounded bg-background text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Aperçu du mot chiffré (Affiché au joueur)</label>
                  <input
                    type="text"
                    value={cipherCaesar(editingJeu.reponse || '', editingJeu.donneesJeu?.decalage ?? 3)}
                    readOnly
                    className="w-full px-3 py-1.5 border border-input rounded bg-muted/50 text-sm outline-none text-primary font-mono cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* ── Charade / Éco-geste ── */}
            {(editingJeu.type === 'CHARADE' || editingJeu.type === 'ECO_GESTE') && (
              <div className="bg-card border border-border rounded-md p-3">
                <label className="text-xs font-medium text-primary block mb-1">Réponse attendue</label>
                <input
                  type="text"
                  value={editingJeu.reponse || ''}
                  onChange={(e) => setEditingJeu({ ...editingJeu, reponse: e.target.value })}
                  className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm outline-none"
                />
              </div>
            )}

            {/* ── Éco-geste (Lien d'engagement optionnel) ── */}
            {editingJeu.type === 'ECO_GESTE' && (
              <div className="bg-card border border-border rounded-md p-3 space-y-3">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Optionnel : Lien d'engagement</p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Titre du lien (ex: Comment fabriquer un gîte à chauve-souris)</label>
                  <input
                    type="text"
                    value={editingJeu.donneesJeu?.linkTitle || ''}
                    onChange={(e) => setEditingJeu({
                      ...editingJeu,
                      donneesJeu: { ...editingJeu.donneesJeu, linkTitle: e.target.value }
                    })}
                    className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">URL (ex: https://lpo.fr/...)</label>
                  <input
                    type="url"
                    value={editingJeu.donneesJeu?.linkUrl || ''}
                    onChange={(e) => setEditingJeu({
                      ...editingJeu,
                      donneesJeu: { ...editingJeu.donneesJeu, linkUrl: e.target.value }
                    })}
                    className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm outline-none"
                  />
                </div>
              </div>
            )}

            {/* ── Calcul Pyramidal ── */}
            {editingJeu.type === 'CALCUL_PYRAMIDAL' && (
              <div className="bg-card border border-border rounded-md p-3 space-y-3">
                <label className="text-xs font-medium text-primary block">Configuration de la pyramide</label>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Choisissez la difficulté (Niveaux) et le résultat cible. Le système générera automatiquement une combinaison valide.
                </p>
                <div className="flex gap-4 items-end mb-4">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Difficulté</label>
                    <div className="w-full px-3 py-1.5 border border-input rounded bg-muted text-sm text-muted-foreground cursor-not-allowed">
                      Normal (4 Niveaux)
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Résultat cible (Sommet)</label>
                    <input
                      type="number"
                      min="8"
                      value={editingJeu.donneesJeu?.targetResult || 50}
                      onChange={(e) => setEditingJeu({
                        ...editingJeu,
                        donneesJeu: { ...editingJeu.donneesJeu, targetResult: Math.max(8, parseInt(e.target.value) || 8), levels: 4 }
                      })}
                      className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const levels = 4;
                      const target = editingJeu.donneesJeu?.targetResult || 50;
                      const pyData = generatePyramid(target, levels);
                      setEditingJeu({ ...editingJeu, donneesJeu: { ...editingJeu.donneesJeu, targetResult: target, ...pyData } });
                    }}
                    className="bg-primary/10 text-primary px-4 py-1.5 rounded text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    Générer la pyramide
                  </button>
                </div>

                {editingJeu.donneesJeu?.grille && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg flex flex-col items-center gap-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Aperçu pour le joueur</p>
                    {editingJeu.donneesJeu.grille.map((row: (number | null)[], rIndex: number) => (
                      <div key={`prev-row-${rIndex}`} className="flex gap-2">
                        {row.map((cell, cIndex) => (
                          <div
                            key={`prev-cell-${cIndex}`}
                            className={`w-10 h-8 flex items-center justify-center rounded border text-sm font-bold relative ${
                              cell !== null
                                ? 'bg-white border-primary/40 text-primary'
                                : 'bg-muted border-border text-transparent'
                            }`}
                          >
                            {cell !== null ? cell : editingJeu.donneesJeu.fullGrid?.[rIndex]?.[cIndex]}
                            {cell === null && (
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground opacity-30">
                                ?
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground mt-2 italic text-center">
                      Les cases avec "?" seront vides sur le téléphone.<br />Le joueur devra déduire les nombres grâce aux cases révélées.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Puzzle ── */}
            {editingJeu.type === 'PUZZLE' && (
              <div className="bg-card border border-border rounded-md p-3 space-y-3">
                <label className="text-xs font-medium text-primary block">Configuration du puzzle</label>

                {/* Image du puzzle */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Photo à découper
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  {editingJeu.imageUrl ? (
                    <div className="relative group">
                      <img
                        src={editingJeu.imageUrl}
                        className="h-32 w-full object-cover rounded border border-border"
                        alt="Image du puzzle"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingJeu({ ...editingJeu, imageUrl: '' })}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Cette image sera découpée en pièces
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setGalleryType('image')}
                      className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded hover:bg-muted/50 text-xs text-muted-foreground transition-colors"
                    >
                      <ImageIcon className="h-6 w-6 opacity-50" />
                      Choisir la photo du puzzle
                    </button>
                  )}
                </div>

                {/* Nombre de pièces */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre de pièces</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 6, 7, 10].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setEditingJeu({
                          ...editingJeu,
                          donneesJeu: { ...editingJeu.donneesJeu, nbPieces: n },
                        })}
                        className={`py-2 rounded-lg border text-sm font-semibold transition-colors ${
                          (editingJeu.donneesJeu?.nbPieces ?? 6) === n
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    L'image sera découpée en {editingJeu.donneesJeu?.nbPieces ?? 6} pièces à repositionner.
                  </p>
                </div>
              </div>
            )}

            {editingJeu.type !== 'INFO' && editingJeu.type !== 'ECO_GESTE' && (
              <>
                {/* ── Explication ── */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Explication (Après avoir répondu / lu)
                  </label>
                  <textarea
                    rows={2}
                    value={editingJeu.explication || ''}
                    onChange={(e) => setEditingJeu({ ...editingJeu, explication: e.target.value })}
                    placeholder="Ex: Le Héron cendré est très commun ici..."
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-primary outline-none resize-none"
                  />
                </div>

                {/* ── Indices ── */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      💡 Indices
                      <span className="text-[10px] font-normal text-amber-600/70 dark:text-amber-500/70">
                        {(editingJeu.donneesJeu?.indices || []).length}/{MAX_INDICES}
                      </span>
                    </label>
                    {(editingJeu.donneesJeu?.indices || []).length < MAX_INDICES && (
                      <button
                        type="button"
                        onClick={handleAddIndice}
                        className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 font-medium transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Ajouter un indice
                      </button>
                    )}
                  </div>

                  {(editingJeu.donneesJeu?.indices || []).length === 0 ? (
                    <p className="text-[11px] text-amber-600/70 dark:text-amber-500/60 italic">
                      Aucun indice — l'application peut en proposer un si le joueur bloque.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(editingJeu.donneesJeu?.indices as string[]).map((indice, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-[10px] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <input
                            type="text"
                            value={indice}
                            onChange={(e) => handleIndiceChange(i, e.target.value)}
                            placeholder={`Indice ${i + 1}...`}
                            className="flex-1 px-2.5 py-1.5 text-sm border border-amber-200 dark:border-amber-800/60 rounded bg-white dark:bg-amber-950/30 outline-none focus:ring-2 focus:ring-amber-400/50 text-foreground"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveIndice(i)}
                            className="text-amber-400 hover:text-red-500 transition-colors"
                            title="Supprimer cet indice"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Paramètres globaux du jeu ── */}
                <div className="bg-muted/30 border border-border rounded-md p-3 space-y-4">
                  <h4 className="text-sm font-semibold text-primary">Options du jeu</h4>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Nombre de tentatives autorisées
                      </label>
                      <input
                        type="number"
                        min="1" max="10"
                        value={editingJeu.maxAttempts ?? 2}
                        onChange={(e) => setEditingJeu({ ...editingJeu, maxAttempts: parseInt(e.target.value) || 2 })}
                        className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm outline-none"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingJeu.isBlocking ?? false}
                          onChange={(e) => setEditingJeu({ ...editingJeu, isBlocking: e.target.checked })}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className="text-sm font-medium text-foreground">Étape obligatoire (Bloquant)</span>
                      </label>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-6">Le joueur ne peut pas passer sans avoir essayé.</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Message en cas d&apos;échec (Optionnel)
                    </label>
                    <input
                      type="text"
                      value={editingJeu.messageEchec || ''}
                      onChange={(e) => setEditingJeu({ ...editingJeu, messageEchec: e.target.value })}
                      placeholder="Oups ! Ce n'était pas la bonne réponse."
                      className="w-full px-3 py-1.5 border border-input rounded bg-background text-sm outline-none"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Affiché si le joueur épuise toutes ses tentatives.</p>
                  </div>
                </div>
              </>
            )}

            {/* ── Image & Audio d'illustration ── */}
            <div className="flex gap-4 pt-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Image d&apos;illustration
                </label>
                {editingJeu.imageUrl ? (
                  <div className="relative group">
                    <img src={editingJeu.imageUrl} className="h-16 w-full object-cover rounded border border-border" alt="" />
                    <button
                      onClick={() => setEditingJeu({ ...editingJeu, imageUrl: '' })}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGalleryType('image')}
                    className="w-full flex items-center justify-center h-16 border-2 border-dashed border-border rounded hover:bg-muted/50 text-xs text-muted-foreground transition-colors"
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
                    <button
                      onClick={() => setEditingJeu({ ...editingJeu, audioUrl: '' })}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGalleryType('audio')}
                    className="w-full flex items-center justify-center h-16 border-2 border-dashed border-border rounded hover:bg-muted/50 text-xs text-muted-foreground transition-colors"
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
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                      {jeu.type}
                      {jeu.type === 'QCM' && jeu.donneesJeu?.qcmType === 'image' && <ImageIcon className="h-3 w-3 opacity-70" />}
                      {jeu.type === 'QCM' && jeu.donneesJeu?.qcmType === 'audio' && <Music className="h-3 w-3 opacity-70" />}
                    </span>
                    <span className="text-sm font-medium text-foreground line-clamp-1 max-w-[200px]">
                      {jeu.question}
                    </span>
                  </div>
                  {(jeu.imageUrl || jeu.audioUrl || (jeu.donneesJeu?.indices?.length > 0)) && (
                    <div className="flex gap-2 mt-1">
                      {jeu.imageUrl && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" />Image</span>}
                      {jeu.audioUrl && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Music className="h-3 w-3" />Audio</span>}
                      {jeu.donneesJeu?.indices?.length > 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                          💡 {jeu.donneesJeu.indices.length} indice{jeu.donneesJeu.indices.length > 1 ? 's' : ''}
                        </span>
                      )}
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

      {/* Galerie pour l'illustration du jeu (image ou audio) */}
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

      {/* Galerie pour les options image/audio du QCM */}
      {qcmMediaPicker && (
        <MediaGalleryModal
          type={qcmMediaPicker.mediaType}
          onClose={() => setQcmMediaPicker(null)}
          onSelect={handleQcmMediaSelect}
        />
      )}
    </div>
  );
}
