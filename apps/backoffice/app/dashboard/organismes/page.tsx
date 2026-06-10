import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import OrganismesClient from './OrganismesClient';

export const metadata: Metadata = { title: 'Réseau National' };

export default function OrganismesPage() {
  return (
    <>
      <Header title="Réseau National" />
      <div className="flex-1 p-6 overflow-y-auto">
        <OrganismesClient />
      </div>
    </>
  );
}
