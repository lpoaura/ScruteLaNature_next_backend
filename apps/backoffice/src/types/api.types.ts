/**
 * Contrats de données alignés avec les DTOs/Entities NestJS.
 * À synchroniser manuellement si le backend évolue.
 */

// ── Auth ──────────────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'GUEST';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pseudo: string | null;
  role: Role;
  organismeId: string | null;
  organisme?: Organisme;
  isEmailVerified: boolean;
  totalPoints: number;
  co2Saved: number;
}

// ── Organisme ─────────────────────────────────────────────────────────────────

export interface Organisme {
  id: string;
  nom: string;
  description: string | null;
  createdAt: string;
}

// ── Zonage ────────────────────────────────────────────────────────────────────

export interface Zonage {
  id: string;
  nom: string;
  codePostal: string;
  createdAt: string;
  _count?: {
    parcours: number;
  };
}

export interface CreateZonageDto {
  nom: string;
  codePostal: string;
}

// ── Parcours ──────────────────────────────────────────────────────────────────

export type PublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Parcours {
  id: string;
  title: string;
  description: string | null;
  status: PublishStatus;
  durationMinutes: number | null;
  distanceKm: number | null;
  difficulty: string | null;
  isPMRFriendly: boolean;
  isChildFriendly: boolean;
  isMentalHandicapFriendly: boolean;
  coverImageUrl: string | null;
  mascotName: string | null;
  mascotAvatarUrl: string | null;
  organismeId: string;
  zonageId: string;
  zonage?: Zonage;
  organisme?: Organisme;
  createdAt: string;
  updatedAt: string;
}

// ── Stats investisseurs ───────────────────────────────────────────────────────

export interface ZonageStats {
  id: string;
  nom: string;
  codePostal: string;
  totalParcours: number;
  totalCompletions: number;
  uniquePlayers: number;
  averageRating: number | null;
}

// ── Avis (Review) ─────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author?: {
    id: string;
    pseudo: string | null;
    email: string;
  };
  parcours?: {
    id: string;
    title: string;
  };
}

// ── API Response générique ────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
