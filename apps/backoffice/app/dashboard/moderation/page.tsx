import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import ModerationClient from './ModerationClient';

export const metadata: Metadata = { title: 'Avis & Modération' };

export default function ModerationPage() {
  return (
    <>
      <Header title="Avis & Modération" />
      <div className="flex-1 p-6 overflow-y-auto">
        <ModerationClient />
      </div>
    </>
  );
}
