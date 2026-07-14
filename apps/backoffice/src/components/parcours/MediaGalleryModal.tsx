'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMedias, uploadMedia, type Media } from '@/src/services/medias.service';

interface MediaGalleryModalProps {
  type: 'image' | 'audio';
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function MediaGalleryModal({ type, onSelect, onClose }: MediaGalleryModalProps) {
  const [medias, setMedias] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch generic illustrations — on passe le type au serveur pour filtrer directement
    getMedias({ type, limit: 200, sortBy })
      .then(res => setMedias(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [type, sortBy]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/') && file.size > 3 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 3 Mo. Veuillez la compresser.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      // Pour une étape/mini-jeu, on stocke en spécifique pour ne pas polluer la galerie
      const uploaded = await uploadMedia(file, 'specific');
      onSelect(uploaded.url);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  const filtered = medias.filter(m => m.originalName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-card w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-border gap-4">
          <h3 className="font-semibold text-lg text-foreground">
            {type === 'image' ? 'Choisir une image' : 'Choisir un fichier audio'}
          </h3>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
              className="px-3 py-1.5 text-sm rounded-md border border-input focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="date">Plus récents</option>
              <option value="name">Alphabétique</option>
            </select>
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 sm:w-48 px-3 py-1.5 text-sm rounded-md border border-input focus:ring-2 focus:ring-primary outline-none"
            />
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept={`${type}/*`} 
              onChange={handleUpload} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2 flex-shrink-0"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="hidden sm:inline">Uploader (spécifique)</span>
            </button>

            <button 
              type="button" 
              onClick={onClose} 
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 bg-muted/20">
          {isLoading ? (
            <div className="py-16 text-center flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{medias.length === 0 ? "Aucun média disponible dans la galerie d'illustrations." : "Aucun résultat pour cette recherche."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(m => (
                <button
                  key={m.filename}
                  type="button"
                  onClick={() => { onSelect(m.url); onClose(); }}
                  title={m.originalName}
                  className={cn(
                    "aspect-square rounded-lg overflow-hidden border-2 transition-all relative group bg-background shadow-sm flex flex-col border-transparent hover:border-primary/50"
                  )}
                >
                  {type === 'image' ? (
                    <img src={m.url} alt={m.originalName} className="w-full h-[80%] object-cover" />
                  ) : (
                    <div className="w-full h-[80%] bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground font-mono">Audio</span>
                    </div>
                  )}
                  <div className="h-[20%] w-full bg-card flex items-center justify-center px-2">
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {m.originalName}
                    </span>
                  </div>
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Sélectionner</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
