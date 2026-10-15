/**
 * Friendly names for the schemas in `api.d.ts`.
 *
 * `api.d.ts` is generated from the backend's OpenAPI document — never edit it.
 * Regenerate with:
 *   npx openapi-typescript src/types/openapi.json -o src/types/api.d.ts
 */

import type { components } from "./api";

type S = components["schemas"];

// ---------------------------------------------------------------- envelope
/** Every successful response from the API has this shape. */
export type ApiEnvelope<T> = { success: boolean; message: string; data: T | null };

export type ValidationDetail = { field: string; message: string; type: string };

export type ApiErrorBody = {
  success: false;
  message: string;
  error_code: string;
  details?: ValidationDetail[] | Record<string, unknown> | null;
};

export type PageMeta = S["PageMeta"];

// -------------------------------------------------------------------- auth
export type AuthResult = S["AuthResult"];
export type TokenPair = S["TokenPair"];
export type UserPublic = S["UserPublic"];
export type OtpSentResult = S["OtpSentResult"];
export type EmailAvailability = S["EmailAvailability"];
export type UserRole = S["UserRole"];
export type AccountStatus = S["AccountStatus"];
export type AuthProvider = S["AuthProvider"];

// ----------------------------------------------------------------- profile
export type UserProfile = S["UserProfile"];
export type ProfileUpdate = S["ProfileUpdate"];
export type ProfileCompleteness = S["ProfileCompleteness"];
export type BirthDetails = S["BirthDetails"];
export type BirthDetailsInput = S["BirthDetailsInput"];
export type CurrentLocation = S["CurrentLocation"];
export type CurrentLocationInput = S["CurrentLocationInput"];
export type NotificationPreferences = S["NotificationPreferences"];
export type Address = S["Address"];
export type AddressInput = S["AddressInput"];
export type AddressUpdate = S["AddressUpdate"];
export type Gender = S["Gender"];
export type MaritalStatus = S["MaritalStatus"];

// -------------------------------------------------------------- astrologer
export type AstrologerPublic = S["AstrologerPublic"];
export type AstrologerProfile = S["AstrologerProfile"];
export type AstrologerCreate = S["AstrologerCreate"];
export type AstrologerCreated = S["AstrologerCreated"];
export type AstrologerUpdate = S["AstrologerUpdate"];
export type AstrologerAdminUpdate = S["AstrologerAdminUpdate"];
export type AvailabilityUpdate = S["AvailabilityUpdate"];
export type Availability = S["Availability"];
export type RateCard = S["RateCard"];
export type RatingSummary = S["RatingSummary"];
export type BankDetails = S["BankDetails"];
export type GalleryImage = S["GalleryImage"];
export type GalleryUploadResult = S["GalleryUploadResult"];
export type Skill = S["Skill"];
export type ConsultationMode = S["ConsultationMode"];

/** `Paginated[AstrologerPublic]`, which openapi-typescript names awkwardly. */
export type PaginatedAstrologers = S["Paginated_AstrologerPublic_"];

// ------------------------------------------------------------------ health
export type HealthStatus = S["HealthStatus"];

// ------------------------------------------------------------------ labels
export const SKILL_LABELS: Record<Skill, string> = {
  vedic_astrology: "Vedic Astrology",
  numerology: "Numerology",
  tarot: "Tarot",
  vastu: "Vastu",
  palmistry: "Palmistry",
  face_reading: "Face Reading",
  kp_astrology: "KP Astrology",
  lal_kitab: "Lal Kitab",
  nadi: "Nadi",
  prashna: "Prashna",
  love_relationship: "Love & Relationship",
  career_business: "Career & Business",
  finance_wealth: "Finance & Wealth",
};

export const SKILLS = Object.keys(SKILL_LABELS) as Skill[];

export const MODE_LABELS: Record<ConsultationMode, string> = {
  chat: "Chat",
  call: "Call",
  video: "Video",
};

export const MODES = Object.keys(MODE_LABELS) as ConsultationMode[];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  undisclosed: "Prefer not to say",
};

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  single: "Single",
  engaged: "Engaged",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
  undisclosed: "Prefer not to say",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "User",
  astrologer: "Astrologer",
  admin: "Admin",
  super_admin: "Super Admin",
};

/** The languages the platform starts with. Free text, so this is only a hint. */
export const COMMON_LANGUAGES = [
  "Hindi",
  "English",
  "Bengali",
  "Marathi",
  "Telugu",
  "Tamil",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Assamese",
  "Urdu",
];
