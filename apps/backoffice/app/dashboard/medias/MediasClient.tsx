'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Music, MapPin, Loader2, FileWarning } from 'lucide-react';
import { getMedias, uploadMedia, deleteMedia, type Media } from '@/src/services/medias.service';
import { cn } from '@/lib/utils';

export default function MediasClient() {
  const [medias, setMedias] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter tabs: 'all', 'image', 'audio', 'gpx'
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'audio' | 'gpx'>('all');

  const fetchMedias = useCallback(() => {
    setIsLoading(true);
    getMedias()
      .then(setMedias)
      .catch(() => setError('Impossible de charger les médias.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchMedias();
  }, [fetchMedias]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setIsUploading(true);

    try {
      // Pour l'instant, on upload fichier par fichier séquentiellement
      const newMedias = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`Le fichier ${file.name} dépasse la limite de 20Mo.`);
        }
        const uploaded = await uploadMedia(file);
        newMedias.push(uploaded);
      }
      
      // On recharge la liste depuis le serveur pour s'assurer du tri et de la consistance
      await fetchMedias();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      // Reset l'input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('Supprimer définitivement ce fichier ?')) return;
    
    try {
      await deleteMedia(filename);
      setMedias((prev) => prev.filter((m) => m.filename !== filename));
    } catch (err) {
      alert('Erreur lors de la suppression du fichier.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const filteredMedias = medias.filter((m) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'image') return m.mimetype.startsWith('image/');
    if (activeTab === 'audio') return m.mimetype.startsWith('audio/');
    if (activeTab === 'gpx') return m.mimetype.includes('gpx');
    return true;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Zone de Drag & Drop */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*,audio/mpeg,audio/wav,application/gpx+xml,.gpx"
          className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-primary" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {isUploading ? 'Upload en cours...' : 'Glissez-déposez vos fichiers ici'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            PNG, JPG, WEBP, MP3, WAV ou GPX jusqu'à 20MB. Vous pouvez aussi cliquer pour parcourir.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3">
          <FileWarning className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-2 border-b border-border pb-4">
        {[
          { id: 'all', label: 'Tous les fichiers' },
          { id: 'image', label: 'Images' },
          { id: 'audio', label: 'Audio' },
          { id: 'gpx', label: 'Tracés GPX' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grille des médias */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm animate-pulse">
              <div className="aspect-square bg-muted"></div>
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted"></div>
                <div className="flex justify-between">
                  <div className="h-2 w-8 rounded bg-muted"></div>
                  <div className="h-2 w-12 rounded bg-muted"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMedias.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Aucun fichier trouvé dans cette catégorie.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMedias.map((media) => {
            const isImage = media.mimetype.startsWith('image/');
            const isAudio = media.mimetype.startsWith('audio/');
            
            return (
              <div 
                key={media.filename} 
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-colors"
              >
                {/* Aperçu */}
                <div className="relative aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    <img src={media.url} alt={media.originalName} className="object-cover w-full h-full" />
                  ) : isAudio ? (
                    <Music className="h-10 w-10 text-muted-foreground/50" />
                  ) : (
                    <MapPin className="h-10 w-10 text-muted-foreground/50" />
                  )}
                  
                  {/* Bouton supprimer (visible au hover) */}
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => handleDelete(media.filename)}
                      className="p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Métadonnées */}
                <div className="p-3">
                  <p className="text-xs font-medium text-foreground truncate" title={media.originalName}>
                    {media.originalName}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="uppercase">{media.mimetype.split('/')[1] || 'Fichier'}</span>
                    <span>{formatSize(media.size)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
