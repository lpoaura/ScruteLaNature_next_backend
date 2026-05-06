import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import ZonagesClient from './ZonagesClient';

export const metadata: Metadata = { title: 'Référentiel des Zonages' };

export default function ZonagesPage() {
  return (
    <>
      <Header title="Référentiel des Zonages" />
      <div className="flex-1 p-6">
        <ZonagesClient />
      </div>
    </>
  );
}
