export const PAYMENT_ENDPOINTS = {
  paychangu: {
    create: '/api/payments/paychangu',
    verify: '/api/payments/paychangu/verify/:txRef',
    webhook: '/api/webhooks/paychangu',
  },
} as const;
