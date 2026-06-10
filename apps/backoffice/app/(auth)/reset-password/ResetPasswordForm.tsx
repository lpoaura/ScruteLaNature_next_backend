'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { resetPassword } from '@/src/services/auth.service';
import { cn } from '@/lib/utils';

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8)           score++;
  if (/[A-Z]/.test(pwd))         score++;
  if (/\d/.test(pwd))            score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { score: 1, label: 'Trop court',  color: 'bg-red-500' },
    { score: 2, label: 'Faible',      color: 'bg-orange-500' },
    { score: 3, label: 'Moyen',       color: 'bg-yellow-500' },
    { score: 4, label: 'Fort ✓',      color: 'bg-emerald-500' },
  ];
  return map[score - 1] ?? { score: 0, label: '', color: '' };
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  if (!token) {
    return (
      <div className="flex flex-col items-center text-center space-y-3 py-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.
        </p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Nouvelle demande
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Mot de passe réinitialisé !</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
        </div>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Aller à la connexion →
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (strength.score < 4) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.');
      return;
    }

    startTransition(async () => {
      try {
        await resetPassword(token, newPassword);
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue. Le lien est peut-être expiré.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nouveau mot de passe */}
      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="newPassword"
            type={showNew ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Min. 8 car., 1 maj., 1 chiffre, 1 spécial"
            disabled={isPending}
            className={cn(
              'w-full rounded-md border border-input bg-background pl-9 pr-10 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              'disabled:opacity-50',
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowNew(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {/* Barre de force */}
        {newPassword && (
          <div className="space-y-1 pt-0.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i <= strength.score ? strength.color : 'bg-muted',
                  )}
                />
              ))}
            </div>
            {strength.label && <p className="text-xs text-muted-foreground">{strength.label}</p>}
          </div>
        )}
      </div>

      {/* Confirmer */}
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Répétez le nouveau mot de passe"
            disabled={isPending}
            className={cn(
              'w-full rounded-md border border-input bg-background pl-9 pr-10 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              'disabled:opacity-50',
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirm(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !newPassword || !confirmPassword}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5',
          'bg-primary text-primary-foreground text-sm font-medium',
          'hover:bg-primary/90 transition-colors',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
      </button>
    </form>
  );
}
