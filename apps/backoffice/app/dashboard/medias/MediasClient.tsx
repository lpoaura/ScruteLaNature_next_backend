'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, Music, MapPin, Loader2, FileWarning } from 'lucide-react';
import { getMedias, uploadMedia, deleteMedia, type Media } from '@/src/services/medias.service';
import PaginationBar from '@/src/components/ui/PaginationBar';
import { cn } from '@/lib/utils';

type TabType = 'all' | 'image' | 'audio' | 'gpx' | 'unused';
const LIMIT = 24;

const TABS: { id: TabType; label: string }[] = [
  { id: 'all',    label: 'Tous les fichiers' },
  { id: 'image',  label: 'Images' },
  { id: 'audio',  label: 'Audio' },
  { id: 'gpx',    label: 'Tracés GPX' },
  { id: 'unused', label: 'Non rattachés' },
];

export default function MediasClient() {
  const [medias, setMedias]       = useState<Media[]>([]);
  const [meta, setMeta]           = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage]           = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortBy, setSortBy]       = useState<'date' | 'name'>('date');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset page à 1 quand on change d'onglet ou de tri
  useEffect(() => { setPage(1); }, [activeTab, sortBy]);

  const fetchMedias = useCallback(() => {
    setIsLoading(true);
    const typeParam = activeTab === 'image' || activeTab === 'audio' || activeTab === 'gpx'
      ? activeTab
      : undefined;
    getMedias({ page, limit: LIMIT, type: typeParam, sortBy })
      .then((res) => {
        // Pour l'onglet "unused", on filtre côté client (le backend ne gère pas ce filtre)
        const data = activeTab === 'unused' ? res.data.filter(m => !m.isUsed) : res.data;
        setMedias(data);
        setMeta({ total: res.meta.total, page: res.meta.page, totalPages: res.meta.totalPages });
      })
      .catch(() => setError('Impossible de charger les médias.'))
      .finally(() => setIsLoading(false));
  }, [page, activeTab, sortBy]);

  useEffect(() => { fetchMedias(); }, [fetchMedias]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/') && file.size > 3 * 1024 * 1024) throw new Error(`L'image ${file.name} dépasse 3Mo.`);
        if (file.size > 20 * 1024 * 1024) throw new Error(`Le fichier ${file.name} dépasse 20Mo.`);
        await uploadMedia(file);
      }
      setPage(1);
      fetchMedias();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('Supprimer définitivement ce fichier ?')) return;
    try {
      await deleteMedia(filename);
      fetchMedias();
    } catch {
      alert('Erreur lors de la suppression du fichier.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files); };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Zone Drag & Drop */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/30',
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
            {isUploading
              ? <Loader2 className="h-8 w-8 text-primary animate-spin" />
              : <Upload className="h-8 w-8 text-primary" />
            }
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {isUploading ? 'Upload en cours...' : 'Glissez-déposez vos fichiers ici'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            PNG, JPG, WEBP, MP3, WAV ou GPX jusqu&apos;à 20MB. Vous pouvez aussi cliquer pour parcourir.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3">
          <FileWarning className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Onglets filtres */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
            className="pl-3 pr-8 py-1.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="date">Plus récents</option>
            <option value="name">Alphabétique</option>
          </select>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {isLoading ? '' : `${meta.total} fichier${meta.total > 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Grille */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="flex justify-between">
                  <div className="h-2 w-8 rounded bg-muted" />
                  <div className="h-2 w-12 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : medias.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          Aucun fichier trouvé dans cette catégorie.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {medias.map((media) => {
            const isImage = media.mimetype.startsWith('image/');
            const isAudio = media.mimetype.startsWith('audio/');
            return (
              <div
                key={media.filename}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="relative aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    <img src={media.url} alt={media.originalName} className="object-cover w-full h-full" />
                  ) : isAudio ? (
                    <Music className="h-10 w-10 text-muted-foreground/50" />
                  ) : (
                    <MapPin className="h-10 w-10 text-muted-foreground/50" />
                  )}

                  <div className="absolute top-2 left-2">
                    {media.isUsed ? (
                      <span className="bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur-md">
                        UTILISÉ
                      </span>
                    ) : (
                      <span className="bg-destructive/90 text-destructive-foreground text-[9px] font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur-md">
                        NON RATTACHÉ
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(media.filename)}
                      className={cn(
                        'p-2 rounded-full transition-transform hover:scale-110',
                        media.isUsed
                          ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                          : 'bg-destructive text-destructive-foreground shadow-md',
                      )}
                      title={media.isUsed ? 'Impossible de supprimer une image utilisée' : 'Supprimer'}
                      disabled={media.isUsed}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

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

      {/* Pagination */}
      <PaginationBar
        page={meta.page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
        className="mt-4"
      />
    </div>
  );
}
