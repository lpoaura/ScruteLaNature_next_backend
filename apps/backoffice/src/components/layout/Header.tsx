'use client';

import { Bell, ChevronDown, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/src/hooks/use-auth';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6 shrink-0">
      {/* Titre de la page courante */}
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      {/* Actions droite */}
      <div className="flex items-center gap-3">
        {/* Toggle dark/light */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-muted-foreground" />
            : <Moon className="h-4 w-4 text-muted-foreground" />}
        </button>

        {/* Notifications (placeholder) */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Avatar utilisateur */}
        <button className="flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 hover:bg-muted transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">
            {user?.firstName ?? user?.email}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
