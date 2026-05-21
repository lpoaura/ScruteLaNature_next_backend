import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Bird } from 'lucide-react';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata: Metadata = { title: 'Réinitialiser le mot de passe — LPO Balades' };

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Logo & Brand */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Bird className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">LPO Balades</h1>
        <p className="mt-1 text-sm text-muted-foreground">Interface d&apos;administration</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Nouveau mot de passe</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe sécurisé pour votre compte.
        </p>
        {/* Suspense requis car ResetPasswordForm utilise useSearchParams() */}
        <Suspense fallback={<div className="h-40 w-full animate-pulse bg-muted rounded-md" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
