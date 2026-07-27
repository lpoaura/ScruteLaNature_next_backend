'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Map,
  Image as ImageIcon,
  Star
} from 'lucide-react';
import { getParcours, deleteParcours, updateParcours, type PaginatedParcours } from '@/src/services/parcours.service';
import { getZonages } from '@/src/services/zonages.service';
import { getOrganismes } from '@/src/services/organismes.service';
import { useAuth } from '@/src/hooks/use-auth';
import { useRoles } from '@/src/hooks/use-roles';
import type { Parcours, Zonage, Organisme, PublishStatus } from '@/src/types/api.types';
import PaginationBar from '@/src/components/ui/PaginationBar';
import { SearchableSelect } from '@/src/components/ui/SearchableSelect';
import { cn } from '@/lib/utils';

const LIMIT = 15;

export default function ParcoursClient() {
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles(user);

  const [parcoursList, setParcoursList] = useState<Parcours[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [zonages, setZonages] = useState<Zonage[]>([]);
  const [organismes, setOrganismes] = useState<Organisme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtres (déclenchent un rechargement serveur)
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PublishStatus | 'ALL'>('ALL');
  const [zonageFilter, setZonageFilter] = useState<string>('ALL');
  const [organismeFilter, setOrganismeFilter] = useState<string>('ALL');

  // Debounce search pour éviter trop d'appels
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page à 1 quand un filtre change
  useEffect(() => { setPage(1); }, [statusFilter, zonageFilter, organismeFilter, debouncedSearch]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(zonageFilter !== 'ALL' ? { zonageId: zonageFilter } : {}),
        ...(isSuperAdmin && organismeFilter !== 'ALL' ? { organismeId: organismeFilter } : {}),
        page,
        limit: LIMIT,
      };
      const [pData, zData, orgData] = await Promise.all([
        getParcours(filters),
        getZonages(),
        ...(isSuperAdmin ? [getOrganismes()] : []) as any[],
      ]);
      setParcoursList(pData.data);
      setMeta({ total: pData.meta.total, page: pData.meta.page, totalPages: pData.meta.totalPages });
      setZonages(zData);
      if (orgData) setOrganismes(orgData);
    } catch (err) {
      console.error('Erreur lors du chargement des parcours', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, statusFilter, zonageFilter, organismeFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer définitivement le parcours "${title}" ?\nAttention, cela supprimera aussi ses étapes et jeux.`)) return;
    try {
      await deleteParcours(id);
      fetchData();
    } catch {
      alert('Erreur lors de la suppression.');
    }
  };

  const toggleCoupDeCoeur = async (parcours: Parcours) => {
    try {
      await updateParcours(parcours.id, { isCoupDeCoeur: !parcours.isCoupDeCoeur });
      // Mettre à jour la liste locale pour un feedback instantané
      setParcoursList(prev => prev.map(p => p.id === parcours.id ? { ...p, isCoupDeCoeur: !parcours.isCoupDeCoeur } : p));
    } catch (err) {
      alert('Erreur lors de la mise à jour du statut Coup de Cœur.');
    }
  };

  // Filtre local rapide par recherche (uniquement sur la page courante)
  const filteredParcours = useMemo(() => {
    if (!debouncedSearch) return parcoursList;
    return parcoursList.filter(p =>
      p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (p.zonage?.nom && p.zonage.nom.toLowerCase().includes(debouncedSearch.toLowerCase())),
    );
  }, [parcoursList, debouncedSearch]);

  const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, { label: string; classes: string }> = {
      PUBLISHED:      { label: 'Publié',      classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      PENDING_REVIEW: { label: 'En attente',  classes: 'bg-violet-100 text-violet-700 border-violet-200' },
      DRAFT:          { label: 'Brouillon',   classes: 'bg-amber-100 text-amber-700 border-amber-200' },
      ARCHIVED:       { label: 'Archivé',     classes: 'bg-slate-100 text-slate-700 border-slate-200' },
    };
    const config = configs[status] || configs.DRAFT;
    return (
      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', config.classes)}>
        {config.label}
      </span>
    );
  };

  const DifficultyBadge = ({ level }: { level: string | null }) => {
    if (!level) return <span className="text-muted-foreground">-</span>;
    const configs: Record<string, { label: string; classes: string }> = {
      FACILE:   { label: 'Facile',    classes: 'bg-green-100 text-green-700' },
      MOYEN:    { label: 'Moyen',     classes: 'bg-blue-100 text-blue-700' },
      DIFFICILE:{ label: 'Difficile', classes: 'bg-red-100 text-red-700' },
    };
    const config = configs[level] || configs.FACILE;
    return (
      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', config.classes)}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un parcours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && organismes.length > 0 && (
            <SearchableSelect
              options={organismes.map((o) => ({ value: o.id, label: o.nom }))}
              value={organismeFilter === 'ALL' ? '' : organismeFilter}
              onChange={(val) => setOrganismeFilter(val || 'ALL')}
              placeholder="Tous les organismes"
              searchPlaceholder="Rechercher un organisme…"
              allowEmpty
              emptyLabel="Tous les organismes"
              className="w-48"
            />
          )}

          {/* Statut : 4 options fixes — select natif suffit */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PublishStatus | 'ALL')}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PUBLISHED">Publiés</option>
              <option value="PENDING_REVIEW">En attente</option>
              <option value="DRAFT">Brouillons</option>
              <option value="ARCHIVED">Archivés</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <SearchableSelect
            options={zonages.map((z) => ({ value: z.id, label: z.nom, sublabel: z.code }))}
            value={zonageFilter === 'ALL' ? '' : zonageFilter}
            onChange={(val) => setZonageFilter(val || 'ALL')}
            placeholder="Tous les zonages"
            searchPlaceholder="Rechercher un zonage…"
            allowEmpty
            emptyLabel="Tous les zonages"
            className="w-52"
          />

          <Link
            href="/dashboard/parcours/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Créer</span>
          </Link>
        </div>
      </div>

      {/* Compteur */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading ? 'Chargement…' : `${meta.total} parcours au total`}
        </span>
        {meta.totalPages > 1 && (
          <span>Page {meta.page} / {meta.totalPages}</span>
        )}
      </div>

      {/* Tableau */}
      {!isLoading && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-16">Image</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Titre</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Créé par</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Zonage</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Énigmes</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Accessibilité</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParcours.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Aucun parcours trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredParcours.map((parcours) => (
                    <tr key={parcours.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="h-12 w-16 rounded overflow-hidden bg-muted flex items-center justify-center border border-border shrink-0">
                          {parcours.coverImage ? (
                            <img src={parcours.coverImage} alt={parcours.title} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground line-clamp-1">{parcours.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {parcours.distanceKm ? `${parcours.distanceKm} km` : '-'} • {parcours.durationMin ? `${parcours.durationMin} min` : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                          {parcours.createdBy ? (
                            <div>
                              <p className="text-sm text-foreground">
                                {parcours.createdBy.firstName || parcours.createdBy.lastName
                                  ? `${parcours.createdBy.firstName ?? ''} ${parcours.createdBy.lastName ?? ''}`.trim()
                                  : parcours.createdBy.email ?? '—'}
                              </p>
                              {isSuperAdmin && (
                                <p className="text-xs text-muted-foreground">{parcours.organisme?.nom ?? '-'}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      <td className="px-4 py-3 text-muted-foreground">{parcours.zonage?.nom || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={parcours.status} /></td>
                      <td className="px-4 py-3"><DifficultyBadge level={parcours.difficulty} /></td>
                      <td className="px-4 py-3"><DifficultyBadge level={parcours.accessibility} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          
                          <button
                            onClick={() => toggleCoupDeCoeur(parcours)}
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              parcours.isCoupDeCoeur 
                                ? "text-amber-500 bg-amber-50 hover:bg-amber-100" 
                                : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50"
                            )}
                            title={parcours.isCoupDeCoeur ? "Retirer des coups de cœur" : "Mettre en coup de cœur"}
                          >
                            <Star className="h-4 w-4" fill={parcours.isCoupDeCoeur ? "currentColor" : "none"} />
                          </button>

                          <Link
                            href={`/dashboard/parcours/${parcours.id}/edit`}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(parcours.id, parcours.title)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
