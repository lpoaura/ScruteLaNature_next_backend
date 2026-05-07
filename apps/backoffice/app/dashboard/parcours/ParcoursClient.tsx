'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Map, 
  Image as ImageIcon 
} from 'lucide-react';
import { getParcours, deleteParcours } from '@/src/services/parcours.service';
import { getZonages } from '@/src/services/zonages.service';
import type { Parcours, Zonage, PublishStatus } from '@/src/types/api.types';
import { cn } from '@/lib/utils';

export default function ParcoursClient() {
  const [parcoursList, setParcoursList] = useState<Parcours[]>([]);
  const [zonages, setZonages] = useState<Zonage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PublishStatus | 'ALL'>('ALL');
  const [zonageFilter, setZonageFilter] = useState<string>('ALL');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pData, zData] = await Promise.all([
        getParcours(),
        getZonages(),
      ]);
      setParcoursList(pData);
      setZonages(zData);
    } catch (err) {
      console.error('Erreur lors du chargement des parcours', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer définitivement le parcours "${title}" ?\nAttention, cela supprimera aussi ses étapes et jeux.`)) return;
    try {
      await deleteParcours(id);
      setParcoursList((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert('Erreur lors de la suppression.');
    }
  };

  const filteredParcours = useMemo(() => {
    return parcoursList.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchZonage = zonageFilter === 'ALL' || p.zonage?.id === zonageFilter;
      return matchSearch && matchStatus && matchZonage;
    });
  }, [parcoursList, searchQuery, statusFilter, zonageFilter]);

  const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, { label: string; classes: string }> = {
      PUBLISHED: { label: 'Publié', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      DRAFT: { label: 'Brouillon', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
      ARCHIVED: { label: 'Archivé', classes: 'bg-slate-100 text-slate-700 border-slate-200' },
    };
    const config = configs[status] || configs.DRAFT;
    return (
      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", config.classes)}>
        {config.label}
      </span>
    );
  };

  const DifficultyBadge = ({ level }: { level: string | null }) => {
    if (!level) return <span className="text-muted-foreground">-</span>;
    const configs: Record<string, { label: string; classes: string }> = {
      FACILE: { label: 'Facile', classes: 'bg-green-100 text-green-700' },
      MOYEN: { label: 'Moyen', classes: 'bg-blue-100 text-blue-700' },
      DIFFICILE: { label: 'Difficile', classes: 'bg-red-100 text-red-700' },
    };
    const config = configs[level] || configs.FACILE;
    return (
      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", config.classes)}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {/* Recherche */}
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

        {/* Filtres et Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PublishStatus | 'ALL')}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PUBLISHED">Publiés</option>
              <option value="DRAFT">Brouillons</option>
              <option value="ARCHIVED">Archivés</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={zonageFilter}
              onChange={(e) => setZonageFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">Tous les zonages</option>
              {zonages.map(z => (
                <option key={z.id} value={z.id}>{z.nom}</option>
              ))}
            </select>
            <Map className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <Link
            href="/dashboard/parcours/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Créer</span>
          </Link>
        </div>
      </div>

      {/* Tableau des parcours */}
      {!isLoading && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-16">Image</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Titre</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Zonage</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Difficulté</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParcours.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
                      <td className="px-4 py-3 text-muted-foreground">
                        {parcours.zonage?.nom || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={parcours.status} />
                      </td>
                      <td className="px-4 py-3">
                        <DifficultyBadge level={parcours.difficulty} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link 
                            href={`/dashboard/parcours/${parcours.id}`}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link 
                            href={`/dashboard/parcours/${parcours.id}/edit`}
                            className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
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
    </div>
  );
}
