'use client';

import { useState, useTransition } from 'react';
import { User, Mail, Building2, Shield, CheckCircle2, XCircle, Save, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/src/hooks/use-auth';
import { updateMe, changePassword } from '@/src/services/profile.service';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Administrateur', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ADMIN:       { label: 'Administrateur',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  EDITOR:      { label: 'Animateur',             color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full pl-9 pr-10 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? 'Masquer' : 'Afficher'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Vérifie la force du mot de passe : maj + chiffre + spécial + 8 car. */
function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd))   score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { score: 1, label: 'Trop court',  color: 'bg-red-500' },
    { score: 2, label: 'Faible',      color: 'bg-orange-500' },
    { score: 3, label: 'Moyen',       color: 'bg-yellow-500' },
    { score: 4, label: 'Fort',        color: 'bg-emerald-500' },
  ];
  return map[score - 1] ?? { score: 0, label: '', color: '' };
}

export default function ProfileClient() {
  const { user, refetch } = useAuth();

  // ── Profil ──
  const [profilePending, startProfileTransition] = useTransition();
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError]   = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    pseudo:    user?.pseudo    ?? '',
  });

  // ── Mot de passe ──
  const [pwdPending, startPwdTransition] = useTransition();
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError,   setPwdError]   = useState<string | null>(null);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const strength = getPasswordStrength(pwdForm.next);

  if (!user) return null;

  const initials = user.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? '?';

  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: 'bg-muted text-muted-foreground border-border' };

  // ── Handlers ──
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    startProfileTransition(async () => {
      try {
        await updateMe({
          firstName: form.firstName || undefined,
          lastName:  form.lastName  || undefined,
          pseudo:    form.pseudo    || undefined,
        });
        await refetch();
        setProfileSuccess('Profil mis à jour avec succès !');
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccess(null);
    setPwdError(null);

    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (strength.score < 4) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.');
      return;
    }

    startPwdTransition(async () => {
      try {
        const res = await changePassword(pwdForm.current, pwdForm.next);
        setPwdSuccess(res.message + ' Vous serez déconnecté des autres appareils.');
        setPwdForm({ current: '', next: '', confirm: '' });
      } catch (err) {
        setPwdError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Carte identité ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <div className="px-6 pb-6 -mt-12 flex items-end gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold ring-4 ring-card shadow-md shrink-0">
            {initials}
          </div>
          <div className="pb-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">
              {user.firstName || user.lastName
                ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                : user.email}
            </h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold border', roleInfo.color)}>
                {roleInfo.label}
              </span>
              {user.organisme && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" /> {user.organisme.nom}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Infos lecture seule ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informations du compte</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Adresse email</p>
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
            </div>
            {user.isEmailVerified
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto shrink-0" aria-label="Email vérifié" />
              : <XCircle     className="h-4 w-4 text-amber-500  ml-auto shrink-0" aria-label="Email non vérifié" />}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rôle</p>
              <p className="text-sm font-medium text-foreground">{roleInfo.label}</p>
            </div>
          </div>

          {user.organisme && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border sm:col-span-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Organisme LPO</p>
                <p className="text-sm font-medium text-foreground">{user.organisme.nom}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Formulaire profil ───────────────────────────────────────────── */}
      <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Modifier mon profil</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="firstName">Prénom</label>
            <input
              id="firstName"
              type="text"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              placeholder="Votre prénom"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="lastName">Nom</label>
            <input
              id="lastName"
              type="text"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              placeholder="Votre nom de famille"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="pseudo">
            Pseudo
            <span className="ml-2 text-xs text-muted-foreground font-normal">(utilisé si vous vous connectez sur l'app mobile)</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="pseudo"
              type="text"
              value={form.pseudo}
              onChange={e => setForm(f => ({ ...f, pseudo: e.target.value }))}
              placeholder="MonPseudo"
              maxLength={50}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {profileSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {profileSuccess}
          </div>
        )}
        {profileError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" /> {profileError}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={profilePending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {profilePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer les modifications
          </button>
        </div>
      </form>

      {/* ── Changer le mot de passe ─────────────────────────────────────── */}
      <form onSubmit={handlePasswordSubmit} className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Changer le mot de passe</h3>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="currentPassword">Mot de passe actuel</label>
          <PasswordInput
            id="currentPassword"
            value={pwdForm.current}
            onChange={v => setPwdForm(f => ({ ...f, current: v }))}
            placeholder="Votre mot de passe actuel"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="newPassword">Nouveau mot de passe</label>
          <PasswordInput
            id="newPassword"
            value={pwdForm.next}
            onChange={v => setPwdForm(f => ({ ...f, next: v }))}
            placeholder="Min. 8 car., 1 maj., 1 chiffre, 1 spécial"
          />
          {/* Barre de force */}
          {pwdForm.next && (
            <div className="space-y-1 pt-1">
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
              {strength.label && (
                <p className="text-xs text-muted-foreground">{strength.label}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
          <PasswordInput
            id="confirmPassword"
            value={pwdForm.confirm}
            onChange={v => setPwdForm(f => ({ ...f, confirm: v }))}
            placeholder="Répétez le nouveau mot de passe"
          />
          {pwdForm.confirm && pwdForm.next !== pwdForm.confirm && (
            <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas.</p>
          )}
        </div>

        {pwdSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {pwdSuccess}
          </div>
        )}
        {pwdError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" /> {pwdError}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={pwdPending || !pwdForm.current || !pwdForm.next || !pwdForm.confirm}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {pwdPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Changer le mot de passe
          </button>
        </div>
      </form>

    </div>
  );
}
