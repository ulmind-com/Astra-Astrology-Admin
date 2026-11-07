/** Typed calls, one function per endpoint. */

import { api, apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  Address,
  FaceRule,
  ReviewPage,
  Review,
  AvailabilityWindow,
  AppointmentCard,
  Appointment,
  AuspiciousTransitInfo,
  AuspiciousTransitSurgeResult,
  BlacklistedClient,
  PrivateInviteLink,
  AddressInput,
  AddressUpdate,
  AdminEarningRow,
  AdminEarningsSummary,
  AdminTransaction,
  AdminWallet,
  AstrologerAdminUpdate,
  AstrologerEarningsBalance,
  AstrologerPayoutRecord,
  BankDetailsUpdate,
  AstrologerCreate,
  AstrologerCreated,
  AstrologerProfile,
  AstrologerPublic,
  AstrologerUpdate,
  AuthResult,
  AvailabilityUpdate,
  Call,
  CallSession,
  Chat,
  ChatSession,
  CoinRateChange,
  ConsultationMode,
  CreateOrderResponse,
  EarningRow,
  EarningsSummary,
  EmailAvailability,
  GalleryUploadResult,
  HealthStatus,
  OtpSentResult,
  PageMeta,
  PaginatedAstrologers,
  PaginatedResult,
  PaymentOrder,
  PaymentOrderStatus,
  PlatformSettings,
  FeaturePricingUpdate,
  ProfileUpdate,
  RechargeOptions,
  ReconcileResult,
  Skill,
  TransactionDirection,
  TransactionReason,
  UserProfile,
  UserPublic,
  VerifyPaymentResponse,
  WalletBalance,
  WalletSummary,
  WalletTransaction,
  WhiteboardData,
  WhiteboardStroke,
} from "@/types";
import type { CoPilotBirthDetailsInput, CoPilotSummary } from "@/types/copilot";
import type { MilanRoom, MilanRoomSession } from "@/types/milan";

// ------------------------------------------------------------------- auth
export const authApi = {
  checkEmail: (email: string) =>
    api.get<EmailAvailability>(endpoints.auth.emailAvailable, {
      query: { email },
      auth: false,
    }),

  register: (body: {
    email: string;
    password: string;
    first_name: string;
    middle_name?: string | null;
    last_name?: string | null;
  }) => api.post<OtpSentResult>(endpoints.auth.registerEmail, body, { auth: false }),

  verifyRegistration: (email: string, code: string) =>
    api.post<AuthResult>(endpoints.auth.registerVerify, { email, code }, { auth: false }),

  resendCode: (email: string) =>
    api.post<OtpSentResult>(endpoints.auth.registerResend, { email }, { auth: false }),

  login: (email: string, password: string) =>
    api.post<AuthResult>(endpoints.auth.login, { email, password }, { auth: false }),

  google: (idToken: string) =>
    api.post<AuthResult>(endpoints.auth.google, { id_token: idToken }, { auth: false }),

  me: () => api.get<UserPublic>(endpoints.auth.me),

  forgotPassword: (email: string) =>
    api.post<OtpSentResult>(endpoints.auth.forgotPassword, { email }, { auth: false }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post<null>(
      endpoints.auth.resetPassword,
      { email, code, new_password: newPassword },
      { auth: false },
    ),

  changePassword: (newPassword: string, currentPassword?: string | null) =>
    api.post<null>(endpoints.auth.changePassword, {
      new_password: newPassword,
      current_password: currentPassword ?? null,
    }),
};

// ---------------------------------------------------------------- profile
export const userApi = {
  profile: () => api.get<UserProfile>(endpoints.users.me),

  updateProfile: (body: ProfileUpdate) => api.patch<UserProfile>(endpoints.users.me, body),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<UserProfile>(endpoints.users.avatar, { method: "POST", body: form });
  },

  removeAvatar: () => api.delete<UserProfile>(endpoints.users.avatar),

  addresses: () => api.get<Address[]>(endpoints.users.addresses),
  addAddress: (body: AddressInput) => api.post<Address>(endpoints.users.addresses, body),
  updateAddress: (id: string, body: AddressUpdate) =>
    api.patch<Address>(endpoints.users.address(id), body),
  deleteAddress: (id: string) => api.delete<null>(endpoints.users.address(id)),
};

// ------------------------------------------------------------- astrologers
export type DirectoryFilters = {
  search?: string;
  skill?: Skill;
  language?: string;
  mode?: ConsultationMode;
  online_only?: boolean;
  featured_only?: boolean;
  min_experience?: number;
  max_coins_per_minute?: number;
  page?: number;
  limit?: number;
};

export const astrologerApi = {
  list: (filters: DirectoryFilters = {}) =>
    api.get<PaginatedAstrologers>(endpoints.astrologers.list, {
      query: filters,
      auth: false,
    }),

  detail: (slugOrId: string) =>
    api.get<AstrologerPublic>(endpoints.astrologers.detail(slugOrId), { auth: false }),

  // the signed-in astrologer's own
  me: () => api.get<AstrologerProfile>(endpoints.astrologers.me),

  updateMe: (body: AstrologerUpdate) =>
    api.patch<AstrologerProfile>(endpoints.astrologers.me, body),

  setAvailability: (body: AvailabilityUpdate) =>
    api.patch<AstrologerProfile>(endpoints.astrologers.availability, body),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<AstrologerProfile>(endpoints.astrologers.image, {
      method: "POST",
      body: form,
    });
  },

  removeImage: () => api.delete<AstrologerProfile>(endpoints.astrologers.image),

  uploadBanner: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<AstrologerProfile>(endpoints.astrologers.banner, {
      method: "POST",
      body: form,
    });
  },

  removeBanner: () => api.delete<AstrologerProfile>(endpoints.astrologers.banner),

  addGalleryImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<GalleryUploadResult>(endpoints.astrologers.gallery, {
      method: "POST",
      body: form,
    });
  },

  removeGalleryImage: (publicId: string) =>
    api.delete<null>(endpoints.astrologers.galleryImage(publicId)),
};

// ------------------------------------------------------------------ admin
export const adminApi = {
  listAstrologers: (params: { search?: string; skip?: number; limit?: number } = {}) =>
    api.get<AstrologerProfile[]>(endpoints.admin.astrologers, { query: params }),

  getAstrologer: (id: string) => api.get<AstrologerProfile>(endpoints.admin.astrologer(id)),

  createAstrologer: (body: AstrologerCreate) =>
    api.post<AstrologerCreated>(endpoints.admin.astrologers, body),

  updateAstrologer: (id: string, body: AstrologerAdminUpdate) =>
    api.patch<AstrologerProfile>(endpoints.admin.astrologer(id), body),

  deactivateAstrologer: (id: string) => api.delete<null>(endpoints.admin.astrologer(id)),
};

// ----------------------------------------------------------------- health
export const healthApi = {
  check: () => api.get<HealthStatus>(endpoints.health, { auth: false }),
};

// ----------------------------------------------------------------- wallet
export const walletApi = {
  summary: () => api.get<WalletSummary>(endpoints.wallet.summary),

  transactions: (params: { page?: number; limit?: number; reason?: TransactionReason } = {}) =>
    api.get<{ items: WalletTransaction[]; meta: PageMeta }>(endpoints.wallet.transactions, {
      query: { page: params.page, limit: params.limit, reason: params.reason },
    }),

  rechargeOptions: () => api.get<RechargeOptions>(endpoints.wallet.rechargeOptions),

  createOrder: (amount_paise: number) =>
    api.post<CreateOrderResponse>(endpoints.wallet.rechargeOrder, { amount_paise }),

  verify: (body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => api.post<VerifyPaymentResponse>(endpoints.wallet.rechargeVerify, body),
};

// ---------------------------------------------------------- admin: wallets
export const adminWalletApi = {
  list: (params: { page?: number; limit?: number; search?: string; frozen?: boolean } = {}) =>
    api.get<{ items: AdminWallet[]; meta: PageMeta }>(endpoints.admin.wallets, {
      query: params,
    }),

  get: (userId: string) => api.get<WalletBalance>(endpoints.admin.wallet(userId)),

  transactions: (
    params: {
      page?: number;
      limit?: number;
      user_id?: string;
      reason?: TransactionReason;
      direction?: TransactionDirection;
    } = {},
  ) =>
    api.get<{ items: AdminTransaction[]; meta: PageMeta }>(endpoints.admin.walletTransactions, {
      query: params,
    }),

  adjust: (
    userId: string,
    body: { direction: TransactionDirection; amount_coins: number; reason: string },
  ) => api.post<WalletBalance>(endpoints.admin.walletAdjust(userId), body),

  freeze: (userId: string, body: { frozen: boolean; reason?: string | null }) =>
    api.post<WalletBalance>(endpoints.admin.walletFreeze(userId), body),

  reconcile: (userId: string) =>
    api.post<ReconcileResult>(endpoints.admin.walletReconcile(userId), {}),

  payments: (params: { page?: number; limit?: number; status?: PaymentOrderStatus } = {}) =>
    api.get<{ items: PaymentOrder[]; meta: PageMeta }>(endpoints.admin.payments, {
      query: params,
    }),

  reconcilePayment: (orderId: string) =>
    api.post<PaymentOrder>(endpoints.admin.paymentReconcile(orderId), {}),
};

// --------------------------------------------------------- admin: settings
export const adminSettingsApi = {
  get: () => api.get<PlatformSettings>(endpoints.admin.settings),

  setCoinRate: (coins_per_rupee: number, note?: string) =>
    api.patch<PlatformSettings>(endpoints.admin.settings, { coins_per_rupee, note }),

  coinRateHistory: () => api.get<CoinRateChange[]>(endpoints.admin.coinRateHistory),

  setConsultationDefaults: (body: {
    default_chat_coins_per_minute?: number;
    default_call_coins_per_minute?: number;
    default_video_coins_per_minute?: number;
    default_commission_percent?: number;
    min_session_minutes?: number;
    max_session_minutes?: number;
    chat_retention_days?: number;
    appointment_commission_percent?: number;
    min_appointment_minutes?: number;
    max_appointment_minutes?: number;
    appointment_booking_days_ahead?: number;
    face_reading_coins?: number;
    face_reading_enabled?: boolean;
  }) => api.patch<PlatformSettings>(endpoints.admin.consultationDefaults, body),

  earnings: () => api.get<AdminEarningsSummary>(endpoints.admin.earnings),

  recentEarnings: (limit = 100) =>
    api.get<AdminEarningRow[]>(endpoints.admin.earningsRecent, { query: { limit } }),

  setRechargeLimits: (body: {
    min_recharge_paise?: number;
    max_recharge_paise?: number;
  }) => api.patch<PlatformSettings>(endpoints.admin.rechargeLimits, body),

  setFeaturePricing: (body: FeaturePricingUpdate) =>
    api.patch<PlatformSettings>(endpoints.admin.featurePricing, body),
};

// ------------------------------------------------------------------- calls
export const callApi = {
  start: (astrologer_id: string, mode: ConsultationMode = "video") =>
    api.post<CallSession>(endpoints.calls.start, { astrologer_id, mode }),

  active: () => api.get<CallSession | null>(endpoints.calls.active),

  get: (id: string) => api.get<CallSession>(endpoints.calls.detail(id)),

  accept: (id: string) => api.post<CallSession>(endpoints.calls.accept(id), {}),

  decline: (id: string) => api.post<Call>(endpoints.calls.decline(id), {}),

  end: (id: string, reason?: string) => api.post<Call>(endpoints.calls.end(id), { reason }),

  heartbeat: (id: string) => api.post<Call>(endpoints.calls.heartbeat(id), {}),

  /** The live Co-Pilot summary for this call's client. Only this call's
   *  astrologer may read it, and only while the session is live. Omitting
   *  the language lets the backend answer in the astrologer's own. */
  copilot: (id: string) => api.get<CoPilotSummary>(endpoints.calls.copilot(id)),

  updateCopilotBirthDetails: (id: string, payload: CoPilotBirthDetailsInput) =>
    api.post<CoPilotSummary>(endpoints.calls.copilotBirthDetails(id), payload),

  extend: (id: string, extra_minutes: number) =>
    api.post<Call>(endpoints.calls.extend(id), { extra_minutes }),

  history: (params: { page?: number; limit?: number } = {}) =>
    api.get<{ items: Call[]; meta: PageMeta }>(endpoints.calls.history, { query: params }),
};

// ------------------------------------------------------------------ milan
/** The multi-party Vedic chamber, from the astrologer's side. Opening one,
 *  inviting guests and paying for it are all the host's, on the user site. */
export const milanApi = {
  active: () => api.get<MilanRoomSession | null>(endpoints.milan.active),
  incoming: () => api.get<MilanRoom | null>(endpoints.milan.incoming),
  get: (id: string) => api.get<MilanRoomSession>(endpoints.milan.detail(id)),
  accept: (id: string) => api.post<MilanRoomSession>(endpoints.milan.accept(id), {}),
  decline: (id: string) => api.post<MilanRoom>(endpoints.milan.decline(id), {}),
  heartbeat: (id: string) => api.post<MilanRoom>(endpoints.milan.heartbeat(id), {}),
  end: (id: string, reason?: string) =>
    api.post<MilanRoom>(endpoints.milan.end(id), null, {
      query: reason ? { reason } : undefined,
    }),
};


// -------------------------------------------------------------- whiteboard
export const whiteboardApi = {
  get: (callId: string) =>
    api.get<WhiteboardData>(`/calls/${callId}/whiteboard`),

  sync: (
    callId: string,
    payload: {
      is_open?: boolean;
      chart_style?: string;
      active_tab?: string;
      drishti?: any;
      highlighted_houses?: number[];
      strokes?: WhiteboardStroke[];
      append_stroke?: WhiteboardStroke;
      clear_strokes?: boolean;
    },
  ) => api.post<WhiteboardData>(`/calls/${callId}/whiteboard/sync`, payload),

  clear: (callId: string) =>
    api.post<WhiteboardData>(`/calls/${callId}/whiteboard/clear`, {}),

  toggle: (callId: string) =>
    api.post<WhiteboardData>(`/calls/${callId}/whiteboard/toggle`, {}),

  loadChart: (
    callId: string,
    payload: {
      name?: string;
      date: string;
      time: string;
      place?: string;
      latitude?: number;
      longitude?: number;
      timezone_offset?: number;
    },
  ) => api.post<WhiteboardData>(`/calls/${callId}/whiteboard/load-chart`, payload),
};

// -------------------------------------------------------------------- chat
export const chatApi = {
  start: (astrologer_id: string) =>
    api.post<ChatSession>(endpoints.chats.start, { astrologer_id }),

  active: () => api.get<ChatSession | null>(endpoints.chats.active),

  get: (id: string) => api.get<ChatSession>(endpoints.chats.detail(id)),

  accept: (id: string) => api.post<ChatSession>(endpoints.chats.accept(id), {}),

  decline: (id: string) => api.post<Chat>(endpoints.chats.decline(id), {}),

  end: (id: string, reason?: string) => api.post<Chat>(endpoints.chats.end(id), { reason }),

  heartbeat: (id: string) => api.post<Chat>(endpoints.chats.heartbeat(id), {}),

  extend: (id: string, extra_minutes: number) =>
    api.post<Chat>(endpoints.chats.extend(id), { extra_minutes }),

  history: (params: { page?: number; limit?: number } = {}) =>
    api.get<{ items: Chat[]; meta: PageMeta }>(endpoints.chats.history, { query: params }),
};

// ------------------------------------------------------ astrologer: earnings
export const earningsApi = {
  summary: () => api.get<EarningsSummary>(endpoints.astrologers.myEarnings),

  balance: () => api.get<AstrologerEarningsBalance>("/astrologers/me/earnings/balance"),

  recent: (limit = 50, skip = 0, mode?: string, search?: string) =>
    api.get<EarningRow[]>(endpoints.astrologers.myEarningsRecent, {
      query: { limit, skip, mode: mode || undefined, search: search || undefined },
    }),

  paginated: (params: {
    page?: number;
    limit?: number;
    mode?: string;
    search?: string;
    window?: string;
  }) =>
    api.get<PaginatedResult<EarningRow>>("/astrologers/me/earnings/paginated", {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        mode: params.mode || undefined,
        search: params.search || undefined,
        window: params.window || undefined,
      },
    }),

  requestPayout: (body: {
    amount_paise: number;
    payout_method: string;
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    ifsc?: string;
    upi_id?: string;
  }) => api.post<AstrologerPayoutRecord>("/astrologers/me/earnings/payout-request", body),

  myPayouts: (limit = 50) =>
    api.get<AstrologerPayoutRecord[]>("/astrologers/me/earnings/payouts", { query: { limit } }),

  updateBankDetails: (body: BankDetailsUpdate) =>
    api.patch<{ saved: boolean }>("/astrologers/me/earnings/bank-details", body),

  adminPayouts: (status?: string, limit = 100) =>
    api.get<AstrologerPayoutRecord[]>("/admin/earnings/payouts", {
      query: { status: status || undefined, limit },
    }),

  adminSettlePayout: (id: string, body: { utr_number: string; admin_notes?: string }) =>
    api.post<AstrologerPayoutRecord>(`/admin/earnings/payouts/${id}/settle`, body),

  adminRejectPayout: (id: string, body: { rejection_reason: string }) =>
    api.post<AstrologerPayoutRecord>(`/admin/earnings/payouts/${id}/reject`, body),

  adminPaginated: (params: {
    page?: number;
    limit?: number;
    mode?: string;
    search?: string;
  }) =>
    api.get<PaginatedResult<AdminEarningRow>>("/admin/earnings/paginated", {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        mode: params.mode || undefined,
        search: params.search || undefined,
      },
    }),
};

// ------------------------------------------------------------ appointments
export const appointmentApi = {
  /** The astrologer's own price card. */
  card: () => api.get<AppointmentCard>(endpoints.appointments.myCard),

  updateCard: (body: {
    enabled?: boolean;
    price_paise?: number;
    block_minutes?: number;
    cancellation_window_minutes?: number;
    buffer_minutes?: number;
    follow_up_enabled?: boolean;
    follow_up_window_days?: number;
    follow_up_max_messages?: number;
    tatkal_enabled?: boolean;
    tatkal_default_multiplier?: number;
  }) => api.patch<AppointmentCard>(endpoints.appointments.myCard, body),

  windows: (days = 60) =>
    api.get<AvailabilityWindow[]>(endpoints.appointments.myWindows, { query: { days } }),

  addWindow: (
    starts_at: string,
    ends_at: string,
    extra?: {
      day?: string;
      timezone?: string;
      is_tatkal?: boolean;
      tatkal_multiplier?: number;
      tatkal_fixed_paise?: number | null;
      custom_title?: string | null;
      is_private?: boolean;
    },
  ) =>
    api.post<AvailabilityWindow>(endpoints.appointments.myWindows, {
      starts_at,
      ends_at,
      timezone: extra?.timezone ?? (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Kolkata"),
      ...(extra || {}),
    }),

  removeWindow: (id: string) => api.delete<null>(endpoints.appointments.myWindow(id)),

  schedule: (upcoming_only = true) =>
    api.get<Appointment[]>(endpoints.appointments.mySchedule, { query: { upcoming_only } }),

  cancel: (id: string, reason?: string) =>
    api.post<Appointment>(endpoints.appointments.cancel(id), { reason: reason ?? null }),

  complete: (id: string) =>
    api.post<Appointment>(`/appointments/${id}/complete`, {}),

  updatePrescription: (
    id: string,
    body: {
      gemstone?: string | null;
      rudraksha?: string | null;
      mantra?: string | null;
      mantra_count?: number | null;
      daan_remedy?: string | null;
      sankalpa?: string | null;
      astrologer_notes?: string | null;
    },
  ) => api.patch<Appointment>(`/appointments/${id}/prescription`, body),

  getPreflight: (id: string, refresh?: boolean) =>
    api.get<Record<string, any>>(`/appointments/${id}/preflight${refresh ? "?refresh=true" : ""}`),

  getKarmicVault: (id: string) =>
    api.get<Record<string, any>>(`/appointments/${id}/karmic-vault`),

  getCertificate: (id: string) =>
    api.get<{
      certificate_id: string;
      issued_at: string;
      astrologer: { name: string; title: string; avatar_url?: string };
      client: { name: string; email?: string };
      consultation_pillar: string;
      session_duration_minutes: number;
      sacred_prescription: {
        consecrated_gemstone: string;
        sacred_rudraksha: string;
        vedic_mantra: string;
        japa_count: number;
        daan_charity_ritual: string;
        sankalpa?: string;
        astrologer_guidance: string;
      };
      vedic_shlokas?: Array<{ sanskrit: string; transliteration?: string; meaning: string }>;
      verification_url: string;
      qr_code_url?: string;
      digital_seal: {
        verification_hash: string;
        seal_title: string;
        seal_motto: string;
        status: string;
        signature?: string;
      };
    }>(`/appointments/${id}/certificate`),

  getCertificateHtmlUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || "https://api.divinlink.com"}/api/v1/appointments/${id}/certificate/html`,

  reschedule: (id: string, new_starts_at: string, reason?: string) =>
    api.post<Appointment>(`/appointments/${id}/reschedule`, { new_starts_at, reason: reason ?? null }),

  markNoShow: (id: string, reason?: string) =>
    api.post<Appointment>(`/appointments/${id}/no-show`, { reason: reason ?? null }),

  joinChamber: (id: string) =>
    api.post<{
      call_id: string;
      room_id: string;
      token: string;
      starts_at: string;
      ends_at: string;
      minutes: number;
    }>(`/appointments/${id}/chamber`, {}),

  activateBrahmaPause: (body: { duration_hours: number; reason?: string | null }) =>
    api.post<{ pause_until: string; affected_appointments_count: number; reason?: string | null }>(
      `/appointments/brahma-pause`,
      body,
    ),

  resumeBrahmaPause: () =>
    api.post<{ message: string }>(`/appointments/brahma-pause/resume`, {}),

  redFlag: (
    id: string,
    body: {
      reason: string;
      notes?: string | null;
      blacklist_client?: boolean;
      terminate_call?: boolean;
    },
  ) => api.post<Appointment>(`/appointments/${id}/red-flag`, body),

  myBlacklist: () => api.get<BlacklistedClient[]>(`/appointments/me/blacklist`),

  unblockClient: (userId: string) =>
    api.post<{ message: string }>(`/appointments/me/blacklist/${userId}/unblock`, {}),

  requestBtr: (id: string, note?: string | null) =>
    api.post<Appointment>(`/appointments/${id}/request-btr`, { note: note ?? null }),

  offerExtension: (id: string, extra_minutes: number = 10) =>
    api.post<Appointment>(`/appointments/${id}/extension/offer`, { extra_minutes }),

  issueFollowUpPass: (
    id: string,
    body: { window_days?: number; max_messages?: number; notes?: string | null },
  ) => api.post<Appointment>(`/appointments/${id}/follow-up/issue`, body),

  sendFollowUpMessage: (id: string, text: string) =>
    api.post<Appointment>(`/appointments/${id}/follow-up/message`, { text }),

  updatePrivateNotes: (id: string, notes: string) =>
    api.patch<Appointment>(`/appointments/${id}/private-notes`, { notes }),

  openTatkalWindow: (body: {
    starts_at: string;
    minutes?: number;
    multiplier?: number;
    fixed_paise?: number | null;
    custom_title?: string;
    is_private?: boolean;
  }) => api.post<AvailabilityWindow>("/appointments/me/tatkal-window", body),

  createPrivateLink: (body: {
    title: string;
    client_name?: string;
    client_email?: string;
    passcode?: string;
    custom_price_paise?: number;
    discount_percent?: number;
    is_tatkal?: boolean;
    max_uses?: number;
    expires_in_hours?: number;
    notes?: string;
  }) => api.post<PrivateInviteLink>("/appointments/me/private-links", body),

  getPrivateLinks: () =>
    api.get<PrivateInviteLink[]>("/appointments/me/private-links"),

  deletePrivateLink: (id: string) =>
    api.delete<{ message: string }>(`/appointments/me/private-links/${id}`),

  getGoogleCalendarAuthUrl: (redirectUri?: string) =>
    api.get<{ configured: boolean; auth_url: string; mode: string; message: string }>(
      `/appointments/google-calendar/auth-url${redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ""}`
    ),

  googleCalendarCallback: (code: string, redirectUri?: string) =>
    api.post<{ connected: boolean; email: string; mode: string; message: string }>(
      "/appointments/google-calendar/callback",
      { code, redirect_uri: redirectUri }
    ),

  syncGoogleCalendar: () =>
    api.post<{ connected: boolean; email: string; busy_count: number; message: string }>(
      "/appointments/google-calendar/sync"
    ),

  disconnectGoogleCalendar: () =>
    api.post<{ connected: boolean }>("/appointments/google-calendar/disconnect"),

  getGoogleCalendarStatus: () =>
    api.get<{
      connected: boolean;
      email: string | null;
      sync_enabled: boolean;
      last_synced_at: string | null;
      busy_count: number;
      busy_intervals: Array<{ starts_at: string; ends_at: string; title: string; source: string; is_external: boolean }>;
    }>("/appointments/google-calendar/status"),

  verifyCertificate: (appointmentId: string) =>
    api.get<any>(`/appointments/prescription/${appointmentId}/verify`, { auth: false }),

  getAuspiciousTransit: (on?: string) =>
    api.get<AuspiciousTransitInfo>(
      `/appointments/auspicious-transit${on ? `?on=${encodeURIComponent(on)}` : ""}`
    ),

  activateTransitSurge: (body: {
    day: string;
    multiplier?: number;
    custom_title?: string | null;
    open_surge_window?: boolean;
    from_time?: string;
    to_time?: string;
  }) => api.post<AuspiciousTransitSurgeResult>("/appointments/me/auspicious-transit-surge", body),

  deactivateTransitSurge: (body: { day: string }) =>
    api.post<AuspiciousTransitSurgeResult>("/appointments/me/auspicious-transit-surge/deactivate", body),
};

// ----------------------------------------------------------------- reviews
export const reviewApi = {
  forMe: (params: { skip?: number; limit?: number } = {}) =>
    api.get<ReviewPage>(endpoints.reviews.forMe, { query: params }),

  forAstrologer: (astrologerId: string, params: { skip?: number; limit?: number } = {}) =>
    api.get<ReviewPage>(endpoints.reviews.forAstrologer(astrologerId), { query: params }),

  myReviews: (params: { skip?: number; limit?: number } = {}) =>
    api.get<ReviewPage>(endpoints.reviews.myAstrologerReviews, { query: params }),

  /** Hiding is not deleting: the row stays, it just stops counting. */
  setHidden: (reviewId: string, hidden: boolean, reason?: string) =>
    api.patch<Review>(endpoints.reviews.hide(reviewId), { hidden, reason: reason ?? null }),
};

// ------------------------------------------------------------ face reading
export const faceReadingApi = {
  /** Where the client's corrections land. Editing a row changes every future
   *  reading — no deploy. */
  rules: (feature?: string) =>
    api.get<FaceRule[]>(endpoints.faceReading.rules, { query: { feature } }),

  updateRule: (
    id: string,
    body: {
      label?: string;
      meaning?: string;
      area?: string | null;
      conditions?: Array<Record<string, unknown>>;
      priority?: number;
      enabled?: boolean;
      reviewed?: boolean;
    },
  ) => api.patch<FaceRule>(endpoints.faceReading.rule(id), body),
};

// ------------------------------------------------------------ AI Astrologer Hub
export interface AIKnowledgeDocItem {
  id: string;
  title: string;
  category: string;
  source_file: string;
  snippet: string;
  created_at: string;
}

export interface AICustomRuleItem {
  id: string;
  rule_title: string;
  trigger_keywords: string[];
  category: string;
  response_bn: string;
  remedy_bn: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface AIFeedbackItem {
  id: string;
  session_id: string;
  user_query: string;
  ai_response: string;
  rating: number;
  feedback_reason: string;
  reviewed_by_admin: boolean;
  admin_corrected_response: string | null;
  added_to_knowledge: boolean;
  created_at: string;
}

export const aiAdminApi = {
  getKnowledge: (params?: { category?: string; limit?: number; skip?: number }) =>
    api.get<{ total: number; docs: AIKnowledgeDocItem[] }>(endpoints.admin.aiKnowledge, { query: params }),

  seedKnowledge: () =>
    api.post<{ seeded_count: number }>(endpoints.admin.aiKnowledgeSeed),

  getRules: () =>
    api.get<AICustomRuleItem[]>(endpoints.admin.aiRules),

  createRule: (body: {
    rule_title: string;
    trigger_keywords: string[];
    category?: string;
    response_bn: string;
    remedy_bn?: string;
    priority?: number;
  }) => api.post<{ rule_id: string; status: string }>(endpoints.admin.aiRules, body),

  updateRule: (
    id: string,
    body: {
      rule_title?: string;
      trigger_keywords?: string[];
      category?: string;
      response_bn?: string;
      remedy_bn?: string;
      priority?: number;
      is_active?: boolean;
    },
  ) => api.patch<{ rule_id: string; status: string }>(endpoints.admin.aiRule(id), body),

  deleteRule: (id: string) =>
    api.delete<{ deleted: boolean }>(endpoints.admin.aiRule(id)),

  getFeedback: (limit?: number) =>
    api.get<AIFeedbackItem[]>(endpoints.admin.aiFeedback, { query: { limit } }),

  approveFeedback: (
    id: string,
    body: {
      admin_corrected_response: string;
      rule_title?: string;
      keywords?: string[];
    },
  ) => api.post<{ rule_id: string; status: string }>(endpoints.admin.aiFeedbackApprove(id), body),
};

export interface HeroCardConfig {
  title: string;
  subtitle: string;
  link: string;
  icon: string;
}

export interface TrustStatConfig {
  value: string;
  label: string;
}

export interface HeroSlideConfig {
  id?: string;
  title: string;
  subtitle: string;
  description?: string;
  cta_text: string;
  cta_link: string;
  badge_text: string;
  badge_rating?: string;
  image_url: string;
  bg_gradient?: string;
  border_color?: string;
}

export interface HomePageCMSData {
  hero_slides?: HeroSlideConfig[];
  hero_eyebrow: string;
  hero_title_line1: string;
  hero_title_line2: string;
  hero_title_highlight: string;
  hero_description: string;
  hero_cta_primary_text: string;
  hero_cta_primary_link: string;
  hero_cta_secondary_text: string;
  hero_cta_secondary_link: string;
  hero_chakra_image_url: string;
  hero_chakra_speed_seconds: number;
  hero_chakra_enabled: boolean;
  hero_cards: HeroCardConfig[];
  trust_stats: TrustStatConfig[];
  services_eyebrow: string;
  services_title: string;
  services_description: string;
  how_it_works_badge: string;
  how_it_works_title: string;
  step1_title: string;
  step1_body: string;
  step2_title: string;
  step2_body: string;
  step3_title: string;
  step3_body: string;
  cta_badge: string;
  cta_title: string;
  cta_description: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
}

export const cmsAdminApi = {
  getHomepage: () => api.get<HomePageCMSData>(endpoints.cms.homepage),
  updateHomepage: (body: Partial<HomePageCMSData>) =>
    api.put<HomePageCMSData>(endpoints.admin.cmsHomepage, body),
  resetHomepage: () =>
    api.post<HomePageCMSData>(endpoints.admin.cmsHomepageReset),
  uploadImage: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ url: string; public_id: string }>(endpoints.admin.cmsUploadImage, {
      method: "POST",
      body: fd,
    });
  },
};

export interface PasskeyInfo {
  id: string;
  credential_id: string;
  device_name: string;
  transports: string[];
  created_at: string;
  last_used_at: string | null;
}

export const passkeyApi = {
  getRegisterOptions: () => api.post<any>(endpoints.passkeys.registerOptions),
  verifyRegistration: (body: { credential: any; device_name?: string }) =>
    api.post<PasskeyInfo>(endpoints.passkeys.registerVerify, body),
  listMine: () => api.get<PasskeyInfo[]>(endpoints.passkeys.mine),
  delete: (id: string) => api.delete<{ deleted: boolean }>(endpoints.passkeys.delete(id)),
  getLoginOptions: (body?: { email?: string }) =>
    api.post<any>(endpoints.passkeys.loginOptions, body || {}, { auth: false }),
  verifyLogin: (body: { credential: any }) =>
    api.post<AuthResult>(endpoints.passkeys.loginVerify, body, { auth: false }),
};


