import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import MediasClient from './MediasClient';

export const metadata: Metadata = { title: 'Médiathèque' };

export default function MediasPage() {
  return (
    <>
      <Header title="Médiathèque" />
      <div className="flex-1 p-6">
        <MediasClient />
      </div>
    </>
  );
}
