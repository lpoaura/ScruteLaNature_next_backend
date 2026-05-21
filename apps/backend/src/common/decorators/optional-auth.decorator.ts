import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';
/**
 * Marque une route comme "auth optionnelle" :
 * - Si un token JWT valide est fourni → req.user est rempli
 * - Sinon → req.user est undefined (la route n'est pas bloquée)
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
