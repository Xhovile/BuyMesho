export const PAYMENT_ENDPOINTS = {
  paychangu: {
    initialize: '/api/payments/paychangu/initialize',
    verify: '/api/payments/paychangu/verify/:txRef',
    webhook: '/api/payments/paychangu/webhook',
  },
} as const;
