'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, Sun, Moon, User, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/src/hooks/use-auth';
import { logout } from '@/src/services/auth.service';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer le dropdown sur Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user?.email ?? '';

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 shrink-0">
      {/* Titre de la page courante */}
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      {/* Actions droite */}
      <div className="flex items-center gap-2">

        {/* Toggle dark/light */}
        <button
          suppressHydrationWarning
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
          title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDark
            ? <Sun className="h-4 w-4 text-muted-foreground" />
            : <Moon className="h-4 w-4 text-muted-foreground" />}
        </button>

        {/* Notifications (placeholder) */}
        <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* ── User Dropdown ─────────────────────────────────────────── */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className={cn(
              'flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 transition-colors',
              dropdownOpen ? 'bg-muted' : 'hover:bg-muted',
            )}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                dropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Menu déroulant */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">

              {/* En-tête du menu */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
              </div>

              {/* Actions */}
              <div className="p-1.5 space-y-0.5">
                <Link
                  href="/dashboard/profil"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  Mon profil
                </Link>

                <div className="h-px bg-border mx-1 my-1" />

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {isLoggingOut ? 'Déconnexion…' : 'Se déconnecter'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
