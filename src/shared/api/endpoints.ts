export const API_BASE_PATH = '/api';

export const ENDPOINTS = {
  auth: {
    me: `${API_BASE_PATH}/auth/me`,
    login: `${API_BASE_PATH}/auth/login`,
    logout: `${API_BASE_PATH}/auth/logout`,
    refresh: `${API_BASE_PATH}/auth/refresh`,
  },
  payments: {
    intents: `${API_BASE_PATH}/payments/intent`,
    confirm: (id: string) => `${API_BASE_PATH}/payments/${id}/confirm`,
    checkout: `${API_BASE_PATH}/payments/checkout`,
    initialize: `${API_BASE_PATH}/payments/initialize`,
    paychangu: {
      initialize: `${API_BASE_PATH}/payments/paychangu/initialize`,
      verify: (txRef: string) => `${API_BASE_PATH}/payments/paychangu/verify/${encodeURIComponent(txRef)}`,
      webhook: `${API_BASE_PATH}/payments/paychangu/webhook`,
    },
  },
  orders: {
    create: `${API_BASE_PATH}/orders`,
    get: (id: string) => `${API_BASE_PATH}/orders/${id}`,
  },
  escrow: {
    get: (orderId: string) => `${API_BASE_PATH}/escrow/${orderId}`,
    hold: (orderId: string) => `${API_BASE_PATH}/escrow/${orderId}/hold`,
    release: (orderId: string) => `${API_BASE_PATH}/escrow/${orderId}/release`,
    refund: (orderId: string) => `${API_BASE_PATH}/escrow/${orderId}/refund`,
  },
  disputes: {
    open: `${API_BASE_PATH}/disputes`,
    get: (orderId: string) => `${API_BASE_PATH}/disputes/${orderId}`,
    resolve: (id: string) => `${API_BASE_PATH}/disputes/${id}`,
  },
  payouts: {
    create: `${API_BASE_PATH}/payouts`,
  },
  listings: {
    all: `${API_BASE_PATH}/listings`,
  },
} as const;
