'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStats, getExportCsvUrl } from '@/src/services/stats.service';
import type { DashboardStats, StatsFilterParams } from '@/src/services/stats.service';
import { Download, Loader2, Map, Users, CheckCircle2, TrendingUp, Building2, BarChart3, Globe, UserCheck, ChevronDown } from 'lucide-react';
import { useAuth } from '@/src/hooks/use-auth';
import { useRoles } from '@/src/hooks/use-roles';
import { getAccessToken } from '@/src/lib/api-client';

// Mini bar chart component
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{value}</span>
    </div>
  );
}

const KPI_CONFIGS = [
  {
    key: 'totalParcours' as const,
    label: 'Parcours créés',
    sublabel: 'au total',
    icon: Map,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'totalPlayers' as const,
    label: 'Joueurs inscrits',
    sublabel: 'comptes joueurs actifs',
    icon: Users,
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'totalMembers' as const,
    label: 'Membres équipe',
    sublabel: 'éditeurs & admins',
    icon: UserCheck,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
    textColor: 'text-violet-700 dark:text-violet-300',
  },
  {
    key: 'totalCompletions' as const,
    label: 'Parcours complétés',
    sublabel: 'par les joueurs',
    icon: CheckCircle2,
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
    textColor: 'text-rose-700 dark:text-rose-300',
  },
];

export default function StatistiquesClient() {
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles(user);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allOrganismes, setAllOrganismes] = useState<{ id: string; nom: string }[]>([]);
  const [allZonages, setAllZonages] = useState<{ id: string; nom: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);

  const [filterOrgId, setFilterOrgId] = useState('');
  const [filterZonageId, setFilterZonageId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Export mirrors active filters
  const [exportOrgId, setExportOrgId] = useState('');
  const [exportZonageId, setExportZonageId] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const fetchStats = useCallback(async (params?: StatsFilterParams) => {
    setIsLoading(true);
    try {
      const data = await getStats(params);
      setStats(data);
      // Populate reference lists from first unfiltered load
      if (!params) {
        setAllOrganismes(data.byOrganisme.map(o => ({ id: o.id, nom: o.nom })));
        setAllZonages(data.byZonage.map(z => ({ id: z.id, nom: z.nom })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const buildActiveParams = (overrides?: Partial<StatsFilterParams>): StatsFilterParams => ({
    organismeId: filterOrgId || undefined,
    zonageId: filterZonageId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    ...overrides,
  });

  const handleFilterOrg = (val: string) => {
    setFilterOrgId(val); setFilterZonageId(''); setExportOrgId(val); setExportZonageId('');
    fetchStats(buildActiveParams({ organismeId: val || undefined, zonageId: undefined }));
  };

  const handleFilterZonage = (val: string) => {
    setFilterZonageId(val); setFilterOrgId(''); setExportZonageId(val); setExportOrgId('');
    fetchStats(buildActiveParams({ zonageId: val || undefined, organismeId: undefined }));
  };

  const handleDateChange = (field: 'startDate' | 'endDate', val: string) => {
    if (field === 'startDate') { setStartDate(val); setExportStartDate(val); }
    else { setEndDate(val); setExportEndDate(val); }
    fetchStats(buildActiveParams({ [field]: val || undefined }));
  };

  const handleReset = () => {
    setFilterOrgId(''); setFilterZonageId(''); setStartDate(''); setEndDate('');
    setExportOrgId(''); setExportZonageId(''); setExportStartDate(''); setExportEndDate('');
    fetchStats(undefined);
  };

  const isFiltered = !!(filterOrgId || filterZonageId || startDate || endDate);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const token = await getAccessToken();
      const url = getExportCsvUrl({
        organismeId: exportOrgId || undefined,
        zonageId: exportZonageId || undefined,
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
      });
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Erreur lors du téléchargement');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'lpo_statistiques_parcours.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'export CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-muted" />
          <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin absolute inset-0" />
        </div>
        <p className="text-muted-foreground font-medium">Chargement des données…</p>
      </div>
    );
  }

  if (!stats) return null;

  const maxParticipants = Math.max(...stats.byOrganisme.map(o => o.totalParticipants), 1);
  const maxParcours = Math.max(...stats.byZonage.map(z => z.nbParcours), 1);
  const completionRate = stats.global.totalParcours > 0
    ? Math.round((stats.global.totalCompletions / stats.global.totalParcours) * 10) / 10
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl shadow-sm">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Filtrer par :</span>

        {isSuperAdmin && allOrganismes.length > 0 && (
          <select value={filterOrgId} onChange={(e) => handleFilterOrg(e.target.value)}
            className="px-3 py-1.5 border border-input rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary">
            <option value="">Tous les organismes</option>
            {allOrganismes.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
          </select>
        )}

        {allZonages.length > 0 && (
          <select value={filterZonageId} onChange={(e) => handleFilterZonage(e.target.value)}
            className="px-3 py-1.5 border border-input rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary">
            <option value="">Tous les zonages</option>
            {allZonages.map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
          </select>
        )}

        {isFiltered && (
          <>
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {filterOrgId ? allOrganismes.find(o => o.id === filterOrgId)?.nom : allZonages.find(z => z.id === filterZonageId)?.nom}
            </span>
            <button onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
              Réinitialiser
            </button>
          </>
        )}

        {/* Date range */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Du</span>
          <input type="date" value={startDate} max={endDate || undefined}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="px-2.5 py-1.5 border border-input rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary" />
          <span className="text-xs text-muted-foreground">au</span>
          <input type="date" value={endDate} min={startDate || undefined}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="px-2.5 py-1.5 border border-input rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>

        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {KPI_CONFIGS.map((cfg) => {
          const Icon = cfg.icon;
          const value = stats.global[cfg.key];
          return (
            <div
              key={cfg.key}
              className={`${cfg.bg} rounded-2xl p-5 border border-border relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200`}
            >
              {/* Decorative gradient blob */}
              <div className={`absolute -top-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br ${cfg.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <div className="flex items-start justify-between mb-3">
                <div className={`${cfg.iconBg} p-2.5 rounded-xl`}>
                  <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-muted-foreground">{cfg.label}</p>
                <p className={`text-4xl font-black tracking-tight ${cfg.textColor}`}>{value.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-muted-foreground">{cfg.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Taux de complétion highlight */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/15 p-3 rounded-xl">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Taux de complétion moyen</p>
            <p className="text-2xl font-bold text-foreground">
              {completionRate} <span className="text-base font-medium text-muted-foreground">complétions / parcours</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => setShowExportPanel((v) => !v)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/25 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showExportPanel ? 'rotate-180' : ''}`} />
          </button>

          {showExportPanel && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-lg w-72 space-y-3 z-10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtres d’export</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Date début</label>
                  <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-input rounded-lg bg-background text-xs outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Date fin</label>
                  <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-input rounded-lg bg-background text-xs outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              {isSuperAdmin && allOrganismes.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Organisme</label>
                  <select value={exportOrgId} onChange={(e) => { setExportOrgId(e.target.value); setExportZonageId(''); }}
                    className="w-full px-2.5 py-1.5 border border-input rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Tous les organismes</option>
                    {allOrganismes.map((o) => (
                      <option key={o.id} value={o.id}>{o.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {allZonages.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Zonage</label>
                  <select value={exportZonageId} onChange={(e) => { setExportZonageId(e.target.value); setExportOrgId(''); }}
                    className="w-full px-2.5 py-1.5 border border-input rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Tous les zonages</option>
                    {allZonages.map((z) => (
                      <option key={z.id} value={z.id}>{z.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              <button onClick={handleExportCsv} disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isExporting ? 'Export en cours…' : 'Télécharger'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Table organismes — 3 cols */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Organismes partenaires</h3>
              <p className="text-xs text-muted-foreground">Tableau croisé pour les investisseurs</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Organisme</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Parcours</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Distance</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Participants</th>
                </tr>
              </thead>
              <tbody>
                {stats.byOrganisme.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground text-sm">
                      Aucune donnée disponible.
                    </td>
                  </tr>
                ) : (
                  stats.byOrganisme
                    .sort((a, b) => b.totalParticipants - a.totalParticipants)
                    .map((org, i) => (
                      <tr key={org.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-muted-foreground/50 w-4">#{i + 1}</span>
                            <span className="font-medium text-foreground">{org.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                            {org.nbParcours}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-muted-foreground text-sm">
                          {org.totalDistanceKm} km
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-bold text-primary">{org.totalParticipants.toLocaleString('fr-FR')}</span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zonages sidebar — 2 cols */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg">
              <Globe className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Par zonage</h3>
              <p className="text-xs text-muted-foreground">Distribution géographique</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {stats.byZonage.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">Aucun zonage enregistré.</p>
            ) : (
              stats.byZonage
                .sort((a, b) => b.nbParcours - a.nbParcours)
                .map((z) => (
                  <div key={z.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground truncate pr-2">{z.nom}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {z.nbParcours} parcours
                      </span>
                    </div>
                    <MiniBar value={z.nbParcours} max={maxParcours} color="hsl(var(--primary))" />
                  </div>
                ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
