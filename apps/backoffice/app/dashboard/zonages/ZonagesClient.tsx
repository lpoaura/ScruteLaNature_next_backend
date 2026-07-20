'use client';

import { useState, useEffect, useTransition } from 'react';
import { Plus, Trash2, Loader2, Search, MapPin, Pencil, Check, X } from 'lucide-react';
import { getZonages, createZonage, updateZonage, deleteZonage } from '@/src/services/zonages.service';
import type { Zonage } from '@/src/types/api.types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/hooks/use-auth';
import { useRoles } from '@/src/hooks/use-roles';

export default function ZonagesClient() {
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles(user);

  const [zonages, setZonages] = useState<Zonage[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire d'ajout
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Édition inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const startEdit = (z: Zonage) => {
    setEditingId(z.id);
    setEditNom(z.nom);
    setEditCode(z.code ?? '');
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleUpdate = (id: string) => {
    if (!editNom.trim()) { setEditError('Le nom est obligatoire.'); return; }
    setEditError(null);
    startSaving(async () => {
      try {
        const updated = await updateZonage(id, { nom: editNom.trim(), code: editCode.trim() || undefined });
        setZonages((prev) => prev.map((z) => (z.id === id ? { ...z, ...updated } : z)));
        setEditingId(null);
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
      }
    });
  };

  // Debounce search pour éviter trop d'appels API
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Chargement avec recherche backend
  useEffect(() => {
    setIsLoading(true);
    getZonages(debouncedSearch)
      .then((data) => {
        setZonages(data);
      })
      .catch(() => setError('Impossible de charger les zonages.'))
      .finally(() => setIsLoading(false));
  }, [debouncedSearch]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nom.trim() || !code.trim()) {
      setFormError('Nom et code sont obligatoires.');
      return;
    }

    startTransition(async () => {
      try {
        const created = await createZonage({ nom: nom.trim(), code: code.trim() });
        setZonages((prev) => [...prev, created]);
        setNom('');
        setCode('');
        setShowForm(false);
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Supprimer le zonage « ${name} » ? Cette action est irréversible.`)) return;

    deleteZonage(id)
      .then(() => setZonages((prev) => prev.filter((z) => z.id !== id)))
      .catch((err: any) => alert(err?.message || 'Impossible de supprimer ce zonage.'));
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between gap-4">
        {/* Recherche */}
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un zonage…"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Bouton ajouter */}
        <button
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            showForm
              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <Plus className="h-4 w-4" />
          Ajouter un zonage
        </button>
      </div>

      {/* Formulaire d'ajout (accordéon) */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Nouveau zonage</h3>
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="nom" className="text-xs font-medium text-muted-foreground">
                Nom du zonage
              </label>
              <input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex: Saint-Étienne"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isPending}
              />
            </div>
            <div className="w-36 space-y-1">
              <label htmlFor="cp" className="text-xs font-medium text-muted-foreground">
                Code
              </label>
              <input
                id="cp"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ex: 07"
                maxLength={10}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isPending}
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer
            </button>
          </form>
          {formError && (
            <p className="mt-2 text-sm text-destructive">{formError}</p>
          )}
        </div>
      )}

      {/* État de chargement (Skeleton) */}
      {isLoading && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Zonage</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Parcours</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-muted"></div></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-muted"></div></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted"></div></td>
                  <td className="px-4 py-3 text-right"><div className="ml-auto h-6 w-24 rounded bg-muted"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Tableau */}
      {!isLoading && !error && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Zonage
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Parcours
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zonages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    <MapPin className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    {search
                      ? 'Aucun zonage ne correspond à votre recherche.'
                      : 'Aucun zonage enregistré. Ajoutez-en un !'}
                  </td>
                </tr>
              ) : (
                zonages.map((z) => (
                  editingId === z.id ? (
                    <tr key={z.id} className="bg-muted/20">
                      <td className="px-4 py-2">
                        <input
                          autoFocus
                          value={editNom}
                          onChange={(e) => setEditNom(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(z.id); if (e.key === 'Escape') cancelEdit(); }}
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          disabled={isSaving}
                        />
                        {editError && <p className="mt-1 text-xs text-destructive">{editError}</p>}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(z.id); if (e.key === 'Escape') cancelEdit(); }}
                          maxLength={10}
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-sm">
                        {z._count?.parcours ?? '—'} parcours
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleUpdate(z.id)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                          >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Enregistrer
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            Annuler
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                  <tr key={z.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{z.nom}</td>
                    <td className="px-4 py-3 text-muted-foreground">{z.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {z._count?.parcours ?? '—'} parcours
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isSuperAdmin && (
                          <button
                            onClick={() => startEdit(z)}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifier
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(z.id, z.nom)}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          {zonages.length > 0 && (
            <div className="border-t border-border bg-muted/30 px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {zonages.length} zonage{zonages.length > 1 ? 's' : ''} affiché{zonages.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
