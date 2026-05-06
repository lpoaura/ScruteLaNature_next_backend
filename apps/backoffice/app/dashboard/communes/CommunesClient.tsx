'use client';

import { useState, useEffect, useTransition } from 'react';
import { Plus, Trash2, Loader2, Search, MapPin } from 'lucide-react';
import { getZonages, createZonage, deleteZonage } from '@/src/services/zonages.service';
import type { Zonage } from '@/src/types/api.types';
import { cn } from '@/lib/utils';

export default function CommunesClient() {
  const [zonages, setZonages] = useState<Zonage[]>([]);
  const [filtered, setFiltered] = useState<Zonage[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire d'ajout
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Chargement initial
  useEffect(() => {
    getZonages()
      .then((data) => {
        setZonages(data);
        setFiltered(data);
      })
      .catch(() => setError('Impossible de charger les communes.'))
      .finally(() => setIsLoading(false));
  }, []);

  // Filtrage en temps réel
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      zonages.filter(
        (z) => z.nom.toLowerCase().includes(q) || z.codePostal.includes(q),
      ),
    );
  }, [search, zonages]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nom.trim() || !codePostal.trim()) {
      setFormError('Nom et code postal sont obligatoires.');
      return;
    }

    startTransition(async () => {
      try {
        const created = await createZonage({ nom: nom.trim(), codePostal: codePostal.trim() });
        setZonages((prev) => [...prev, created]);
        setNom('');
        setCodePostal('');
        setShowForm(false);
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : 'Erreur lors de la création.');
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Supprimer la commune « ${name} » ? Cette action est irréversible.`)) return;

    deleteZonage(id)
      .then(() => setZonages((prev) => prev.filter((z) => z.id !== id)))
      .catch(() => alert('Impossible de supprimer cette commune.'));
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
            placeholder="Rechercher une commune…"
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
          Ajouter une commune
        </button>
      </div>

      {/* Formulaire d'ajout (accordéon) */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Nouvelle commune</h3>
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="nom" className="text-xs font-medium text-muted-foreground">
                Nom de la commune
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
                Code postal
              </label>
              <input
                id="cp"
                value={codePostal}
                onChange={(e) => setCodePostal(e.target.value)}
                placeholder="42000"
                maxLength={5}
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

      {/* État de chargement */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                  Commune
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Code postal
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    <MapPin className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    {search
                      ? 'Aucune commune ne correspond à votre recherche.'
                      : 'Aucune commune enregistrée. Ajoutez-en une !'}
                  </td>
                </tr>
              ) : (
                filtered.map((z) => (
                  <tr key={z.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{z.nom}</td>
                    <td className="px-4 py-3 text-muted-foreground">{z.codePostal}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {z._count?.parcours ?? '—'} parcours
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(z.id, z.nom)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="border-t border-border bg-muted/30 px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {filtered.length} commune{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
