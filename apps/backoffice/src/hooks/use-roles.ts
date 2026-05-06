'use client';

import type { UserProfile, Role } from '@/src/types/api.types';

/**
 * Vérifie si un utilisateur a le rôle requis.
 * Hiérarchie : SUPER_ADMIN > ADMIN > EDITOR > GUEST
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  EDITOR: 2,
  GUEST: 1,
};

/**
 * Hook pour les vérifications de rôle à la volée.
 * Usage : const { isSuperAdmin, hasRole } = useRoles(user);
 */
export function useRoles(user: UserProfile | null) {
  const role = user?.role ?? 'GUEST';

  const hasRole = (requiredRole: Role): boolean => {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
  };

  return {
    role,
    isSuperAdmin: role === 'SUPER_ADMIN',
    isAdmin: hasRole('ADMIN'),
    isEditor: hasRole('EDITOR'),
    hasRole,
  };
}
