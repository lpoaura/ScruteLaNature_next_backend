'use client';

import { useState, useEffect, useTransition } from 'react';
import { Plus, Pencil, Check, X, Loader2, Building2 } from 'lucide-react';
import { getOrganismes, createOrganisme, updateOrganisme, type OrganismeDetail } from '@/src/services/organismes.service';

export default function OrganismesClient() {
  const [organismes, setOrganismes] = useState<OrganismeDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newNom, setNewNom] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNom, setEditingNom] = useState('');

  useEffect(() => {
    getOrganismes()
      .then(setOrganismes)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = () => {
    if (!newNom.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createOrganisme(newNom.trim());
        setOrganismes((prev) => [...prev, { ...created, _count: { employes: 0, parcours: 0 } }].sort((a, b) => a.nom.localeCompare(b.nom)));
        setNewNom('');
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
      }
    });
  };

  const handleUpdate = (id: string) => {
    if (!editingNom.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateOrganisme(id, editingNom.trim());
        setOrganismes((prev) => prev.map((o) => o.id === id ? { ...o, nom: updated.nom } : o));
        setEditingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{organismes.length} organisme(s) dans le réseau</p>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvel organisme
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Formulaire création */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold border-b border-border pb-3 mb-4">Nouvel organisme LPO</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newNom}
              onChange={(e) => setNewNom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ex: LPO Rhône-Alpes"
              autoFocus
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={handleCreate} disabled={isPending || !newNom.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Créer
            </button>
            <button onClick={() => { setShowForm(false); setNewNom(''); }}
              className="p-2 rounded-md border border-border hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {organismes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Building2 className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Aucun organisme pour le moment.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organisme</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Membres</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Parcours</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Créé le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {organismes.map((org) => (
                <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    {editingId === org.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editingNom}
                          onChange={(e) => setEditingNom(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(org.id); if (e.key === 'Escape') setEditingId(null); }}
                          className="flex-1 px-2 py-1 border border-input rounded bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button onClick={() => handleUpdate(org.id)} disabled={isPending}
                          className="p-1 rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-foreground">{org.nom}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{org._count?.employes ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{org._count?.parcours ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId !== org.id && (
                      <button onClick={() => { setEditingId(org.id); setEditingNom(org.nom); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
