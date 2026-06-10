import type { Metadata } from 'next';
import { Bird } from 'lucide-react';
import ForgotPasswordForm from './ForgotPasswordForm';

export const metadata: Metadata = { title: 'Mot de passe oublié — LPO Balades' };

export default function ForgotPasswordPage() {
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
        <h2 className="mb-1 text-lg font-semibold text-foreground">Mot de passe oublié</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
