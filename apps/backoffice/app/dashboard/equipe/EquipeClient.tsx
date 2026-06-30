'use client';

import { useState, useEffect, useTransition } from 'react';
import { UserPlus, Trash2, Loader2, Users, CheckCircle2, Clock, Search, X, Wand2 } from 'lucide-react';
import { getTeam, createTeamMember, deleteTeamMember, type TeamMember, type CreateTeamMemberDto } from '@/src/services/users.service';
import { getOrganismes, type OrganismeDetail } from '@/src/services/organismes.service';
import { useAuth } from '@/src/hooks/use-auth';
import { useRoles } from '@/src/hooks/use-roles';
import PaginationBar from '@/src/components/ui/PaginationBar';
import { SearchableSelect } from '@/src/components/ui/SearchableSelect';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  EDITOR: 'Éditeur',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  EDITOR: 'bg-emerald-100 text-emerald-700',
};

export default function EquipeClient() {
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles(user);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const [organismes, setOrganismes] = useState<OrganismeDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterOrganisme, setFilterOrganisme] = useState<string>('');

  // Debounce search pour éviter trop d'appels API
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Retourner à la page 1 lors d'une nouvelle recherche
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Retour à la page 1 si on change un filtre
  useEffect(() => {
    setPage(1);
  }, [filterRole, filterOrganisme]);

  const [form, setForm] = useState<CreateTeamMemberDto>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'EDITOR',
    organismeId: '',
  });

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    // Ensure requirements
    pass += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    pass += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    pass += '0123456789'[Math.floor(Math.random() * 10)];
    pass += '!@#$%^&*'[(Math.floor(Math.random() * 8))];
    
    for (let i = 0; i < 8; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
    setForm((f) => ({ ...f, password: pass }));
  };

  useEffect(() => {
    setIsLoading(true);
    const fetches: Promise<any>[] = [getTeam(page, LIMIT, debouncedSearch, filterRole, filterOrganisme)];
    if (isSuperAdmin && organismes.length === 0) fetches.push(getOrganismes());

    Promise.all(fetches)
      .then(([teamResult, orgs]) => {
        setMembers(teamResult.data);
        setMeta({ total: teamResult.meta.total, page: teamResult.meta.page, totalPages: teamResult.meta.totalPages });
        if (orgs) setOrganismes(orgs);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isSuperAdmin, page, debouncedSearch, filterRole, filterOrganisme]);

  const handleCreate = () => {
    setError(null);
    setSuccess(null);

    const dto: CreateTeamMemberDto = { ...form };
    if (!isSuperAdmin) {
      dto.organismeId = user?.organismeId ?? undefined;
    }
    if (!dto.organismeId) {
      setError('Veuillez sélectionner un organisme.');
      return;
    }

    startTransition(async () => {
      try {
        const created = await createTeamMember(dto);
        setMembers((prev) => [created as any, ...prev]);
        setShowForm(false);
        setForm({ email: '', password: '', firstName: '', lastName: '', role: 'EDITOR', organismeId: '' });
        setSuccess(`Compte créé pour ${created.email}. Un email de vérification a été envoyé.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la création.');
      }
    });
  };

  // Filtrage local supprimé -> filtrage backend

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer définitivement ce compte ?')) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteTeamMember(id);
        setMembers((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
      } finally {
        setDeletingId(null);
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
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header + bouton */}
      {/* Barre de recherche + filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full pl-9 pr-8 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tous les rôles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Administrateur</option>
          <option value="EDITOR">Éditeur</option>
        </select>

        {isSuperAdmin && organismes.length > 0 && (
          <SearchableSelect
            options={organismes.map((o) => ({ value: o.id, label: o.nom }))}
            value={filterOrganisme}
            onChange={setFilterOrganisme}
            placeholder="Tous les organismes"
            searchPlaceholder="Rechercher un organisme…"
            allowEmpty
            emptyLabel="Tous les organismes"
            className="w-52"
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {meta.total} membre(s) au total
          {(search || filterRole || filterOrganisme) && (
            <button onClick={() => { setSearch(''); setFilterRole(''); setFilterOrganisme(''); }}
              className="ml-2 text-primary hover:underline text-xs">
              Réinitialiser
            </button>
          )}
        </p>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); setSuccess(null); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Inviter un membre
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Formulaire de création */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold border-b border-border pb-3">Nouveau membre</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prénom</label>
              <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom</label>
              <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Mot de passe temporaire <span className="text-destructive">*</span></label>
                <button type="button" onClick={generatePassword} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <Wand2 className="h-3 w-3" /> Générer
                </button>
              </div>
              <input type="text" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 car., maj, chiffre, spécial"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rôle <span className="text-destructive">*</span></label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'EDITOR' }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm outline-none focus:ring-2 focus:ring-primary">
                <option value="EDITOR">Éditeur (crée des parcours)</option>
                <option value="ADMIN">Administrateur (gère l'équipe)</option>
              </select>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Organisme <span className="text-destructive">*</span></label>
              <SearchableSelect
                options={organismes.map((o) => ({ value: o.id, label: o.nom }))}
                value={form.organismeId ?? ''}
                onChange={(val) => setForm((f) => ({ ...f, organismeId: val }))}
                placeholder="Sélectionner un organisme"
                searchPlaceholder="Rechercher un organisme…"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Créer le compte
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des membres */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">{search || filterRole || filterOrganisme ? 'Aucun résultat pour ces filtres.' : "Aucun membre dans l'équipe pour le moment."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Membre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rôle</th>
                {isSuperAdmin && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organisme</th>}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email vérifié</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Créé le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {m.firstName || m.lastName ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[m.role] ?? 'bg-muted text-muted-foreground')}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-muted-foreground">{(m as any).organisme?.nom ?? '—'}</td>
                  )}
                  <td className="px-4 py-3">
                    {m.isEmailVerified
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <span title="En attente de vérification"><Clock className="h-4 w-4 text-amber-500" /></span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.id !== user?.id && (
                      <button onClick={() => handleDelete(m.id)} disabled={isPending && deletingId === m.id}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                        {isPending && deletingId === m.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
