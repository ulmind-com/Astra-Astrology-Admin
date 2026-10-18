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
export type ResolvedRates = S["ResolvedRates"];
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

// ------------------------------------------------------------------ wallet
export type WalletBalance = S["WalletBalance"];
export type WalletSummary = S["WalletSummary"];
export type WalletTransaction = S["TransactionOut"];
export type TransactionDirection = S["TransactionDirection"];
export type TransactionReason = S["TransactionReason"];
export type RechargeOptions = S["RechargeOptions"];
export type RechargePack = S["RechargePack"];
export type CreateOrderResponse = S["CreateOrderResponse"];
export type VerifyPaymentResponse = S["VerifyPaymentResponse"];
export type PaymentOrder = S["PaymentOrderOut"];
export type PaymentOrderStatus = S["PaymentOrderStatus"];
export type AdminWallet = S["AdminWalletOut"];
export type AdminTransaction = S["AdminTransactionOut"];
export type ReconcileResult = S["ReconcileResult"];

/** What a ledger row is called on screen. */
export const TRANSACTION_REASON_LABELS: Record<TransactionReason, string> = {
  recharge: "Recharge",
  consultation: "Consultation",
  refund: "Refund",
  adjustment: "Adjustment",
  bonus: "Bonus",
  payout: "Payout",
  reversal: "Reversal",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  created: "Started",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
};

export type PlatformSettings = S["PlatformSettingsOut"];
export type CoinRateChange = S["CoinRateChangeOut"];

/**
 * Money crosses the wire as integer paise and is only turned into rupees here,
 * so the two apps can never disagree about what a balance means.
 */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  // Rounded, never truncated: 0.1 + 0.2 in floating point is 0.30000000000000004.
  return Math.round(rupees * 100);
}

/**
 * Coins are what the wallet actually holds. They are never shown as a rupee
 * value, because the admin can change the rate and coins already bought keep
 * the rate they were bought at — so there is no one rupee figure for a balance.
 */
export function formatCoins(coins: number): string {
  return new Intl.NumberFormat("en-IN").format(coins);
}

export function coinWord(coins: number): string {
  return coins === 1 ? "coin" : "coins";
}

// ------------------------------------------------------------------- calls
export type Call = S["CallOut"];
export type CallCredentials = S["CallCredentials"];
export type CallSession = S["CallSessionOut"];
export type CallStatus = S["CallStatus"];
export type CallParty = S["CallParty"];

/** A call in one of these is still going on. */
export const LIVE_CALL_STATUSES: CallStatus[] = ["ringing", "active"];

export function isCallLive(status: CallStatus): boolean {
  return LIVE_CALL_STATUSES.includes(status);
}

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  ringing: "Ringing",
  active: "In progress",
  ended: "Ended",
  declined: "Declined",
  missed: "Missed",
  cancelled: "Cancelled",
  failed: "Failed",
};

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// -------------------------------------------------------------------- chat
export type Chat = S["ChatOut"];
export type ChatSession = S["ChatSessionOut"];
export type ChatStatus = S["ChatStatus"];

export const LIVE_CHAT_STATUSES: ChatStatus[] = ["requested", "active"];

export function isChatLive(status: ChatStatus): boolean {
  return LIVE_CHAT_STATUSES.includes(status);
}

export const CHAT_STATUS_LABELS: Record<ChatStatus, string> = {
  requested: "Waiting for the astrologer",
  active: "In progress",
  ended: "Ended",
  declined: "Declined",
  missed: "Not picked up",
  cancelled: "Cancelled",
};

// --------------------------------------------------------------- billing
export type ConsultationQuote = S["ConsultationQuote"];
export type SessionBilling = S["SessionBilling"];
export type EarningsSummary = S["EarningsSummary"];
export type EarningsBucket = S["EarningsBucket"];
export type EarningRow = S["EarningRow"];
export type AdminEarningRow = S["AdminEarningRow"];
export type AdminEarningsSummary = S["AdminEarningsSummary"];

/** Earnings are money, so they are paise — never coins. */
export function formatEarning(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
