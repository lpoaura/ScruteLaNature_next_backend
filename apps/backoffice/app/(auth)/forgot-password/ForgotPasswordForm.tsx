'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '@/src/services/auth.service';
import { cn } from '@/lib/utils';

export default function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await forgotPassword(email);
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      }
    });
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Email envoyé !</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
            Pensez à vérifier vos spams.
          </p>
        </div>
        <Link href="/login" className="text-sm text-primary hover:underline flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Adresse email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@lpo.fr"
            disabled={isPending}
            className={cn(
              'w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5',
          'bg-primary text-primary-foreground text-sm font-medium',
          'hover:bg-primary/90 transition-colors',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}
      </button>

      <div className="text-center">
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Retour à la connexion
        </Link>
      </div>
    </form>
  );
}
