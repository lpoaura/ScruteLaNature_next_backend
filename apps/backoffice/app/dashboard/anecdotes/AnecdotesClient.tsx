'use client';

import { useState, useEffect, useTransition } from 'react';
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon, EyeOff, Eye } from 'lucide-react';
import { getAnecdotes, deleteAnecdote, updateAnecdote } from '@/src/services/anecdotes.service';
import type { Anecdote } from '@/src/types/api.types';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

function resolveMediaUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function AnecdotesClient() {
  const [anecdotes, setAnecdotes] = useState<Anecdote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnecdotes();
  }, []);

  const fetchAnecdotes = () => {
    setIsLoading(true);
    getAnecdotes()
      .then(setAnecdotes)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  const handleToggleActive = async (anecdote: Anecdote) => {
    try {
      const updated = await updateAnecdote(anecdote.id, { isActive: !anecdote.isActive });
      setAnecdotes((prev) => prev.map((a) => (a.id === anecdote.id ? updated : a)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette anecdote définitivement ?')) return;
    try {
      await deleteAnecdote(id);
      setAnecdotes((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{anecdotes.length} anecdote(s) enregistrée(s)</p>
        <Link
          href="/dashboard/anecdotes/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle anecdote
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {anecdotes.map((anecdote) => (
          <div key={anecdote.id} className="rounded-xl border border-border bg-card shadow-sm flex overflow-hidden">
            <div className="w-24 bg-muted flex items-center justify-center shrink-0">
              {anecdote.imageUrl ? (
                <img src={resolveMediaUrl(anecdote.imageUrl)} alt="Picto" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <p className="text-sm text-card-foreground line-clamp-3 mb-4">{anecdote.content}</p>
              
              <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
                <button
                  onClick={() => handleToggleActive(anecdote)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                    anecdote.isActive 
                      ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30' 
                      : 'text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800'
                  }`}
                >
                  {anecdote.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {anecdote.isActive ? 'Active' : 'Masquée'}
                </button>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/anecdotes/${anecdote.id}/edit`}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(anecdote.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {anecdotes.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            Aucune anecdote n'a été créée pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
