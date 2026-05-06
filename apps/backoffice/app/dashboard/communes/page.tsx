import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import CommunesClient from './CommunesClient';

export const metadata: Metadata = { title: 'Référentiel des Communes' };

export default function CommunesPage() {
  return (
    <>
      <Header title="Référentiel des Communes" />
      <div className="flex-1 p-6">
        <CommunesClient />
      </div>
    </>
  );
}
