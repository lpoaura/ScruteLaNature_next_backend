import { Loader2 } from 'lucide-react';
import { Header } from '@/src/components/layout/Header';

export default function EditParcoursLoading() {
  return (
    <>
      <Header title="Chargement du parcours..." />
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Préchargement des étapes et de la carte en cours...</p>
        </div>
      </div>
    </>
  );
}
