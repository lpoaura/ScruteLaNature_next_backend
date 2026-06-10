import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page introuvable | LPO Balades',
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Page introuvable
      </h1>
      
      <p className="mb-8 max-w-md text-muted-foreground">
        Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      
      <Link 
        href="/dashboard" 
        className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au tableau de bord
      </Link>
    </div>
  );
}
