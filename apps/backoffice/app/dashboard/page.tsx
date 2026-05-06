import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import {
  Map,
  Users,
  Leaf,
  MapPin,
  Plus,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Tableau de bord' };

const KPI_CARDS = [
  {
    label: 'Parcours actifs',
    value: '—',
    sub: 'dont — en brouillon',
    icon: Map,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    label: 'Joueurs inscrits',
    value: '—',
    sub: '— invités',
    icon: Users,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    label: 'CO₂ économisé',
    value: '— kg',
    sub: 'par la communauté locale',
    icon: Leaf,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Communes couvertes',
    value: '—',
    sub: 'dans votre secteur',
    icon: MapPin,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
];

const QUICK_ACTIONS = [
  {
    label: 'Créer un parcours',
    href: '/dashboard/parcours/new',
    icon: Plus,
    description: 'Démarrer une nouvelle balade',
  },
  {
    label: 'Voir les avis',
    href: '/dashboard/moderation',
    icon: ArrowRight,
    description: 'Modérer les retours joueurs',
  },
  {
    label: 'Statistiques',
    href: '/dashboard/stats',
    icon: ArrowRight,
    description: 'Export pour les financeurs',
  },
];

export default function DashboardPage() {
  return (
    <>
      <Header title="Tableau de bord" />

      <div className="flex-1 space-y-8 p-6">
        {/* KPIs */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vue d&apos;ensemble
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KPI_CARDS.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{kpi.label}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{kpi.value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${kpi.bg}`}>
                      <Icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Actions rapides */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Placeholder contenu futur */}
        <section className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            📊 Les données seront affichées ici une fois le backend connecté.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sprint 2 — Branchement des APIs de statistiques
          </p>
        </section>
      </div>
    </>
  );
}
