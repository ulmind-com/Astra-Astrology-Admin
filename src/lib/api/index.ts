/** Typed calls, one function per endpoint. */

import { api, apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  Address,
  AddressInput,
  AddressUpdate,
  AdminTransaction,
  AdminWallet,
  AstrologerAdminUpdate,
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
  EmailAvailability,
  GalleryUploadResult,
  HealthStatus,
  OtpSentResult,
  PageMeta,
  PaginatedAstrologers,
  PaymentOrder,
  PaymentOrderStatus,
  PlatformSettings,
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
} from "@/types";

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
  max_rate?: number;
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

  history: (params: { page?: number; limit?: number } = {}) =>
    api.get<{ items: Call[]; meta: PageMeta }>(endpoints.calls.history, { query: params }),
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

  history: (params: { page?: number; limit?: number } = {}) =>
    api.get<{ items: Chat[]; meta: PageMeta }>(endpoints.chats.history, { query: params }),
};
