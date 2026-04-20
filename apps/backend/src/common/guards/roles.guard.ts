import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // S'il n'y a pas de roles exigés, on laisse passer (Le JwtAuthGuard a déjà fait le travail de base)
    if (!requiredRoles) {
      return true;
    }

    // Récupérer l'utilisateur qui a été attaché à la requête par le JwtStrategy
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: Role } }>();
    const user = request.user;

    // Check du Role
    return requiredRoles.some((role) => user?.role === role);
  }
}
