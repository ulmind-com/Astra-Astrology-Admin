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

  admin: {
    astrologers: "/admin/astrologers",
    astrologer: (id: string) => `/admin/astrologers/${id}`,
  },
} as const;
