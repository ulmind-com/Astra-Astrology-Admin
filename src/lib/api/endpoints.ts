/** Every backend route in one place, so a path change is a one-line edit. */

export const endpoints = {
  health: "/health",

  auth: {
    registerEmail: "/auth/register/email",
    registerVerify: "/auth/register/email/verify",
    registerResend: "/auth/register/email/resend",
    emailAvailable: "/auth/email/available",
    login: "/auth/login",
    google: "/auth/google",
    me: "/auth/me",
    forgotPassword: "/auth/password/forgot",
    resetPassword: "/auth/password/reset",
    changePassword: "/auth/password/change",
  },

  users: {
    me: "/users/me",
    avatar: "/users/me/avatar",
    addresses: "/users/me/addresses",
    address: (id: string) => `/users/me/addresses/${id}`,
  },

  astrologers: {
    list: "/astrologers",
    detail: (slugOrId: string) => `/astrologers/${slugOrId}`,
    me: "/astrologers/me",
    availability: "/astrologers/me/availability",
    image: "/astrologers/me/image",
    gallery: "/astrologers/me/gallery",
    galleryImage: (publicId: string) => `/astrologers/me/gallery/${publicId}`,
  },

  wallet: {
    summary: "/wallet",
    transactions: "/wallet/transactions",
    rechargeOptions: "/wallet/recharge/options",
    rechargeOrder: "/wallet/recharge/order",
    rechargeVerify: "/wallet/recharge/verify",
  },

  calls: {
    start: "/calls",
    active: "/calls/active",
    history: "/calls/history",
    detail: (id: string) => `/calls/${id}`,
    accept: (id: string) => `/calls/${id}/accept`,
    decline: (id: string) => `/calls/${id}/decline`,
    end: (id: string) => `/calls/${id}/end`,
    heartbeat: (id: string) => `/calls/${id}/heartbeat`,
  },

  chats: {
    start: "/chats",
    active: "/chats/active",
    history: "/chats/history",
    detail: (id: string) => `/chats/${id}`,
    accept: (id: string) => `/chats/${id}/accept`,
    decline: (id: string) => `/chats/${id}/decline`,
    end: (id: string) => `/chats/${id}/end`,
    heartbeat: (id: string) => `/chats/${id}/heartbeat`,
  },

  admin: {
    astrologers: "/admin/astrologers",
    astrologer: (id: string) => `/admin/astrologers/${id}`,
    wallets: "/admin/wallets",
    wallet: (userId: string) => `/admin/wallets/${userId}`,
    walletAdjust: (userId: string) => `/admin/wallets/${userId}/adjust`,
    walletFreeze: (userId: string) => `/admin/wallets/${userId}/freeze`,
    walletReconcile: (userId: string) => `/admin/wallets/${userId}/reconcile`,
    walletTransactions: "/admin/wallets/transactions",
    payments: "/admin/wallets/payments",
    paymentReconcile: (orderId: string) => `/admin/wallets/payments/${orderId}/reconcile`,
    settings: "/admin/settings",
    coinRateHistory: "/admin/settings/coin-rate-history",
    rechargeLimits: "/admin/settings/recharge-limits",
  },
} as const;
