import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import ParcoursClient from './ParcoursClient';

export const metadata: Metadata = { title: 'Mes Parcours' };

export default function ParcoursPage() {
  return (
    <>
      <Header title="Mes Parcours" />
      <div className="flex-1 p-6">
        <ParcoursClient />
      </div>
    </>
  );
}
