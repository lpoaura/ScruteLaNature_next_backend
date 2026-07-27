import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import AnecdotesClient from './AnecdotesClient';

export const metadata: Metadata = { title: 'Le saviez-vous ?' };

export default function AnecdotesPage() {
  return (
    <>
      <Header title="Le saviez-vous ? (Anecdotes)" />
      <div className="flex-1 p-6 overflow-y-auto">
        <AnecdotesClient />
      </div>
    </>
  );
}
