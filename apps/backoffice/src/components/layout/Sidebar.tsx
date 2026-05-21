'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Map,
  MapPin,
  BarChart2,
  Image,
  MessageSquare,
  Users,
  Building2,
  LogOut,
  Bird,
  PanelLeft,
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
  { label: 'Zonages', href: '/dashboard/zonages', icon: MapPin },
  { label: 'Parcours', href: '/dashboard/parcours', icon: Map },
  { label: 'Médiathèque', href: '/dashboard/medias', icon: Image },
  { label: 'Avis & Modération', href: '/dashboard/moderation', icon: MessageSquare },
  { label: 'Statistiques', href: '/dashboard/statistiques', icon: BarChart2, adminOnly: true },
  { label: 'Mon Équipe', href: '/dashboard/equipe', icon: Users, adminOnly: true },
  { label: 'Organismes', href: '/dashboard/organismes', icon: Building2, superAdminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isAdmin, isSuperAdmin } = useRoles(user);

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) setCollapsed(stored === 'true');
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  const initials = user?.firstName
    ? user.firstName[0].toUpperCase()
    : user?.email?.[0].toUpperCase() ?? '?';

  if (!mounted) return <aside className="w-64 shrink-0" />;

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-sidebar transition-all duration-200 ease-in-out shrink-0',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* Logo + toggle */}
      <div className={cn('flex items-center border-b border-border shrink-0', collapsed ? 'h-auto flex-col justify-center gap-2 py-3 px-0' : 'h-16 gap-3 px-4')}>
        {/* Logo */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Bird className="h-5 w-5 text-primary-foreground" />
        </div>

        {!collapsed && (
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground leading-none truncate">
              LPO Balades
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 truncate">
              {user?.organisme?.nom ?? 'Backoffice'}
            </span>
          </div>
        )}

        <button
          onClick={toggle}
          title={collapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
            collapsed && 'mt-1',
          )}
        >
          <PanelLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : 'gap-3',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
