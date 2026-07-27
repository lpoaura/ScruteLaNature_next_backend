'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAnecdote, updateAnecdote } from '@/src/services/anecdotes.service';
import type { Anecdote } from '@/src/types/api.types';
import { Loader2, Save, ArrowLeft, Image as ImageIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { uploadMedia } from '@/src/services/medias.service';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

function resolveMediaUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface AnecdoteFormProps {
  initialData?: Anecdote;
}

export default function AnecdoteForm({ initialData }: AnecdoteFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState(initialData?.content || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const uploaded = await uploadMedia(file, 'specific');
      setImageUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      try {
        setError(null);
        if (isEditing) {
          await updateAnecdote(initialData.id, { content, imageUrl: imageUrl || undefined, isActive });
        } else {
          await createAnecdote({ content, imageUrl: imageUrl || undefined, isActive });
        }
        router.push('/dashboard/anecdotes');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/anecdotes"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <button
          type="submit"
          disabled={isPending || isUploading || !content.trim()}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEditing ? 'Enregistrer les modifications' : 'Créer l\'anecdote'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Le saviez-vous ? <span className="text-destructive">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ex: Le chardonneret élégant se nourrit principalement de graines de chardons, d'où il tire son nom !"
              className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary resize-y"
              required
            />
            <p className="text-xs text-muted-foreground">Restez bref et percutant (max ~3 lignes sur mobile).</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground block">
              Image / Picto (Optionnel)
            </label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                {imageUrl ? (
                  <img src={resolveMediaUrl(imageUrl)} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground max-w-sm">
                  Une petite image ou icône qui accompagnera le texte. Si vide, une icône nature générique sera utilisée.
                </p>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-input bg-background rounded-md text-sm font-medium hover:bg-muted cursor-pointer transition-colors">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>Uploader une image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="ml-2 text-xs text-destructive hover:underline"
                  >
                    Retirer l'image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Activer cette anecdote</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-7">
              Seules les anecdotes actives seront envoyées vers l'application mobile.
            </p>
          </div>

        </div>
      </div>
    </form>
  );
}
