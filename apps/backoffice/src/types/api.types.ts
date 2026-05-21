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
  code: string;
  createdAt: string;
  _count?: {
    parcours: number;
  };
}

export interface CreateZonageDto {
  nom: string;
  code: string;
}

// ── Parcours ──────────────────────────────────────────────────────────────────

export type PublishStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface Parcours {
  id: string;
  title: string;
  description: string | null;
  status: PublishStatus;
  durationMin: number | null;
  distanceKm: number | null;
  difficulty: string | null;
  isPMRFriendly: boolean;
  isChildFriendly: boolean;
  isMentalHandicapFriendly: boolean;
  coverImage: string | null;
  mascotteNom: string | null;
  mascotteImg: string | null;
  pathGeoJSON?: string | null;
  organismeId: string;
  zonageId: string;
  zonage?: Zonage;
  organisme?: Organisme;
  createdBy?: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
  etapes?: Etape[];
  createdAt: string;
  updatedAt: string;
}

// ── Etapes & Jeux ─────────────────────────────────────────────────────────────

export interface Etape {
  id: string;
  parcoursId: string;
  order: number;
  latitude: number;
  longitude: number;
  title: string;
  description: string | null;
  transitionText: string | null;
  jeux?: Jeu[];
  createdAt: string;
  updatedAt: string;
}

export type JeuType = 'INFO' | 'QCM' | 'CHARADE' | 'CODE_CAESAR' | 'CALCUL_PYRAMIDAL' | 'VALIDATION_LIEU' | 'ECO_GESTE' | 'PUZZLE';

export interface Jeu {
  id: string;
  etapeId: string;
  order: number;
  type: JeuType;
  question: string;
  explication: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  donneesJeu: any | null;
  reponse: string | null;
}

// ── Stats investisseurs ───────────────────────────────────────────────────────

export interface ZonageStats {
  id: string;
  nom: string;
  code: string;
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
