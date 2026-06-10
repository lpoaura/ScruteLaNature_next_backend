import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import ParcoursForm from '@/src/components/parcours/ParcoursForm';

export const metadata: Metadata = { title: 'Nouveau Parcours' };

export default function NewParcoursPage() {
  return (
    <>
      <Header title="Nouveau Parcours" />
      <div className="flex-1 p-6 overflow-y-auto">
        <ParcoursForm />
      </div>
    </>
  );
}
