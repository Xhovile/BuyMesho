export const PAYMENT_ENDPOINTS = {
  paychangu: {
    initialize: '/api/payments/paychangu/initialize',
    verify: '/api/payments/paychangu/verify/:txRef',
    webhook: '/api/webhooks/paychangu',
  },
} as const;
