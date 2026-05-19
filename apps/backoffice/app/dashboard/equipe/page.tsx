import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import EquipeClient from './EquipeClient';

export const metadata: Metadata = { title: 'Mon Équipe' };

export default function EquipePage() {
  return (
    <>
      <Header title="Mon Équipe" />
      <div className="flex-1 p-6 overflow-y-auto">
        <EquipeClient />
      </div>
    </>
  );
}
