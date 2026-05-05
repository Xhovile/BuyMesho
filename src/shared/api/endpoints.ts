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
    paychangu: {
      initialize: `${API_BASE_PATH}/payments/paychangu/initialize`,
      verify: (txRef: string) => `${API_BASE_PATH}/payments/paychangu/verify/${encodeURIComponent(txRef)}`,
      webhook: `${API_BASE_PATH}/payments/paychangu/webhook`,
    },
  },
  escrow: {
    hold: (orderId: string) => `${API_BASE_PATH}/escrow/${orderId}/hold`,
    release: (orderId: string) => `${API_BASE_PATH}/escrow/${orderId}/release`,
    refund: (orderId: string) => `${API_BASE_PATH}/escrow/${orderId}/refund`,
  },
  listings: {
    all: `${API_BASE_PATH}/listings`,
  },
} as const;
