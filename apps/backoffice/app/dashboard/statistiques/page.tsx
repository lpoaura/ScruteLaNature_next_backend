import { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import StatistiquesClient from './StatistiquesClient';

export const metadata: Metadata = {
  title: 'Statistiques & Exports | Scrute La Nature',
  description: "Tableau de bord des statistiques de l'application LPO Balades.",
};

export default function StatistiquesPage() {
  return (
    <>
      <Header title="Statistiques & Exports" />
      <div className="flex-1 p-6">
        <StatistiquesClient />
      </div>
    </>
  );
}

