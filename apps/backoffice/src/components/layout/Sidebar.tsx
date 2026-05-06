'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  MapPin,
  BarChart2,
  Image,
  MessageSquare,
  Users,
  Building2,
  Settings,
  LogOut,
  Bird,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/hooks/use-auth';
import { useRoles } from '@/src/hooks/use-roles';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Si vrai, uniquement visible pour ADMIN et SUPER_ADMIN */
  adminOnly?: boolean;
  /** Si vrai, uniquement visible pour SUPER_ADMIN */
  superAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Parcours', href: '/dashboard/parcours', icon: Map },
  { label: 'Communes', href: '/dashboard/communes', icon: MapPin },
  { label: 'Médiathèque', href: '/dashboard/medias', icon: Image },
  { label: 'Avis & Modération', href: '/dashboard/moderation', icon: MessageSquare },
  { label: 'Statistiques', href: '/dashboard/stats', icon: BarChart2 },
  { label: 'Mon Équipe', href: '/dashboard/equipe', icon: Users, adminOnly: true },
  { label: 'Réseau National', href: '/dashboard/organismes', icon: Building2, superAdminOnly: true },
  { label: 'Paramètres', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isAdmin, isSuperAdmin } = useRoles(user);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Bird className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground leading-none">
            LPO Balades
          </span>
          <span className="text-xs text-muted-foreground mt-0.5">
            {user?.organisme?.nom ?? 'Backoffice'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Profil & Déconnexion */}
      <div className="border-t border-border p-3">
        <div className="mb-2 rounded-md px-3 py-2">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {user?.firstName ?? user?.email}
          </p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
