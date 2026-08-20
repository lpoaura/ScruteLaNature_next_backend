import { getSignalements } from '@/src/services/signalements.service';
import SignalementsClient from './SignalementsClient';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Signalements | LPO Balades',
};

export default async function SignalementsPage() {
  const signalements = await getSignalements();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/50">
          <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Signalements Terrain
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gérez les problèmes remontés par les joueurs sur les parcours.
          </p>
        </div>
      </div>

      <SignalementsClient initialData={signalements} />
    </div>
  );
}
