import type { Metadata } from 'next';
import LoginForm from './LoginForm';
import { Bird } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Connexion',
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      {/* Logo & Brand */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Bird className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">LPO Balades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interface d&apos;administration
        </p>
      </div>

      {/* Formulaire */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Connexion</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Entrez vos identifiants pour accéder au backoffice.
        </p>
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Accès réservé aux collaborateurs LPO.<br />
        Contactez votre administrateur si vous avez perdu vos accès.
      </p>
    </div>
  );
}
