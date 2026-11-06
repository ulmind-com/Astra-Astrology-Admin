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
export type AstrologerPublic = S["AstrologerPublic"] & {
  banner_image_url?: string | null;
};
export type AstrologerProfile = S["AstrologerProfile"] & {
  banner_image_url?: string | null;
  brahma_pause_until?: string | null;
  brahma_pause_reason?: string | null;
  brahma_pause_activated_at?: string | null;
};
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
export type PaymentOrder = S["PaymentOrderOut"] & {
  user_email?: string | null;
  user_name?: string | null;
};
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
  appointment_deposit: "Appointment booking",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  created: "Started",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
};

export type PlatformSettings = S["PlatformSettingsOut"] & {
  daily_horoscope_coins?: number;
  daily_horoscope_enabled?: boolean;
  kundli_coins?: number;
  kundli_enabled?: boolean;
  kundli_matching_coins?: number;
  kundli_matching_enabled?: boolean;
  kp_calculator_coins?: number;
  kp_calculator_enabled?: boolean;
  dasha_calculator_coins?: number;
  dasha_calculator_enabled?: boolean;
  rashi_calculator_coins?: number;
  rashi_calculator_enabled?: boolean;
  nakshatra_calculator_coins?: number;
  nakshatra_calculator_enabled?: boolean;
  palm_reading_coins?: number;
  palm_reading_enabled?: boolean;
  face_reading_coins?: number;
  face_reading_enabled?: boolean;
  numerology_coins?: number;
  numerology_enabled?: boolean;
  vastu_coins?: number;
  vastu_enabled?: boolean;
};

export interface FeaturePricingItem {
  feature_id: string;
  name: string;
  coins: number;
  is_free: boolean;
  enabled: boolean;
  description?: string;
}

export interface FeaturePricingUpdate {
  daily_horoscope_coins?: number;
  daily_horoscope_enabled?: boolean;
  kundli_coins?: number;
  kundli_enabled?: boolean;
  kundli_matching_coins?: number;
  kundli_matching_enabled?: boolean;
  kp_calculator_coins?: number;
  kp_calculator_enabled?: boolean;
  dasha_calculator_coins?: number;
  dasha_calculator_enabled?: boolean;
  rashi_calculator_coins?: number;
  rashi_calculator_enabled?: boolean;
  nakshatra_calculator_coins?: number;
  nakshatra_calculator_enabled?: boolean;
  palm_reading_coins?: number;
  palm_reading_enabled?: boolean;
  face_reading_coins?: number;
  face_reading_enabled?: boolean;
  numerology_coins?: number;
  numerology_enabled?: boolean;
  vastu_coins?: number;
  vastu_enabled?: boolean;
}

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
export interface ExtensionOffer {
  offered: boolean;
  status: "none" | "pending" | "accepted" | "declined" | "expired";
  extra_minutes?: number | null;
  cost_coins: number;
  cost_paise: number;
  offered_at?: string | null;
}

export type Call = S["CallOut"] & {
  appointment_id?: string | null;
  extension_offer?: ExtensionOffer | null;
};
export type CallCredentials = S["CallCredentials"];
export type CallSession = Omit<S["CallSessionOut"], "call"> & {
  call: Call;
};
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
export type EarningRow = S["EarningRow"] & {
  user_id?: string | null;
  user_name?: string | null;
  user_avatar?: string | null;
  user_image_url?: string | null;
  coins_charged?: number | null;
  gross_paise?: number | null;
};
export type AdminEarningRow = S["AdminEarningRow"] & {
  user_id?: string | null;
  user_name?: string | null;
  user_avatar?: string | null;
  user_image_url?: string | null;
};
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

// ------------------------------------------------------------- appointments
export type VedicPrescription = {
  gemstone?: string | null;
  rudraksha?: string | null;
  mantra?: string | null;
  mantra_count?: number | null;
  daan_remedy?: string | null;
  astrologer_notes?: string | null;
  updated_at?: string | null;
};

export type Appointment = Omit<S["AppointmentOut"], "peer"> & {
  consultation_pillar?: string | null;
  kundli_id?: string | null;
  birth_details?: Record<string, any> | null;
  prescription?: VedicPrescription | null;
  muhurat_type?: string | null;
  preflight_dossier?: Record<string, any> | null;
  cosmic_synergy_score?: number | null;
  certificate_data?: Record<string, any> | null;
  standby_queue?: Array<Record<string, any>> | null;
  rescheduled_count?: number;
  rescheduled_at?: string | null;
  previous_starts_at?: string | null;
  reschedule_reason?: string | null;
  is_no_show?: boolean;
  no_show_marked_at?: string | null;
  no_show_wait_minutes?: number | null;
  brahma_pause_affected?: boolean;
  brahma_pause_reason?: string | null;
  brahma_pause_until?: string | null;
  rescue_deadline?: string | null;
  abuse_flagged?: boolean;
  abuse_reason?: string | null;
  abuse_flagged_at?: string | null;
  btr_requested?: boolean;
  btr_request_note?: string | null;
  btr_requested_at?: string | null;
  btr_fulfilled?: boolean;
  btr_updated_at?: string | null;
  extension_offered?: boolean;
  extension_offered_minutes?: number | null;
  extension_cost_coins?: number;
  extension_cost_paise?: number;
  extension_offered_at?: string | null;
  extension_status?: "none" | "pending" | "accepted" | "declined" | "expired";
  extension_total_extended_minutes?: number;
  follow_up_pass_enabled?: boolean;
  follow_up_window_days?: number;
  follow_up_expires_at?: string | null;
  follow_up_max_messages?: number;
  follow_up_messages_used?: number;
  follow_up_granted_at?: string | null;
  follow_up_notes?: string | null;
  follow_up_thread?: Array<{
    id: string;
    sender_id: string;
    sender_role: "user" | "astrologer";
    sender_name: string;
    text: string;
    sent_at: string;
  }>;
  is_tatkal?: boolean;
  tatkal_multiplier?: number | null;
  tatkal_premium_paise?: number;
  tatkal_premium_coins?: number;
  is_private?: boolean;
  invite_code?: string | null;
  peer?: S["AppointmentPeer"] | null;
  held_coins?: number;
  held_status?: string;
  cancellation_window_minutes?: number;
  cancel_deadline?: string | null;
  can_cancel?: boolean;
  completed_at?: string | null;
};
export type AppointmentQuote = S["AppointmentQuote"] & {
  balance_due_coins?: number;
  total_coins?: number;
  available_coins?: number;
  is_tatkal?: boolean;
  tatkal_multiplier?: number;
  tatkal_premium_paise?: number;
  tatkal_premium_coins?: number;
  is_private?: boolean;
};
export type AppointmentStatus = S["AppointmentStatus"];
export type AppointmentCard = S["AppointmentCardOut"] & {
  cancellation_window_minutes?: number;
  buffer_minutes?: number;
  follow_up_enabled?: boolean;
  follow_up_window_days?: number;
  follow_up_max_messages?: number;
  tatkal_enabled?: boolean;
  tatkal_default_multiplier?: number;
};
export type AvailabilityWindow = S["WindowOut"] & {
  is_tatkal?: boolean;
  tatkal_multiplier?: number;
  tatkal_fixed_paise?: number | null;
  custom_title?: string | null;
  is_private?: boolean;
};
export type AppointmentDayView = S["DayView"];

export interface PrivateInviteLink {
  id: string;
  astrologer_id: string;
  invite_code: string;
  title: string;
  client_name?: string | null;
  client_email?: string | null;
  has_passcode: boolean;
  custom_price_paise?: number | null;
  discount_percent?: number | null;
  is_tatkal: boolean;
  max_uses: number;
  uses_count: number;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
  notes?: string | null;
}

export interface BlacklistedClient {
  user_id: string;
  name: string;
  email_masked?: string | null;
  phone_masked?: string | null;
  avatar_url?: string | null;
  blacklisted_at?: string | null;
  last_reason?: string | null;
  notes?: string | null;
  total_reports: number;
}

/** What a booking's state is called on screen. */
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: "Booked",
  cancelled: "Cancelled",
  completed: "Completed",
  missed: "Missed",
};

// ----------------------------------------------------------------- reviews
export type Review = S["ReviewOut"] & {
  author_avatar?: string | null;
  author_avatar_url?: string | null;
  session_id?: string | null;
};
export type ReviewPage = Omit<S["ReviewPage"], "items"> & {
  items: Review[];
};
export type ReviewSummary = S["ReviewSummary"];
export type PendingReview = S["PendingReview"];
export type ReviewKind = S["ReviewKind"];

/** What each kind of consultation is called in a review. */
export const REVIEW_KIND_LABELS: Record<ReviewKind, string> = {
  chat: "Chat",
  call: "Voice call",
  video: "Video call",
  appointment: "Appointment",
};

// ------------------------------------------------------------ face reading
export type FaceReading = S["FaceReadingOut"];
export type FaceReadingSection = S["ReadingSectionOut"];
export type FaceReadingAvailability = S["FaceReadingAvailability"];
export type FaceRule = S["RuleOut"];
