import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = { title: 'Mon Profil — LPO Balades' };

export default function ProfilPage() {
  return (
    <>
      <Header title="Mon Profil" />
      <div className="flex-1 p-6 overflow-y-auto">
        <ProfileClient />
      </div>
    </>
  );
}
