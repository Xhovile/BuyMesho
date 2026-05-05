export const PAYMENT_ENDPOINTS = {
  paychangu: {
    create: '/api/payments/paychangu',
    verify: '/api/payments/paychangu/verify/:txRef',
    webhook: '/api/payments/paychangu/webhook',
  },
} as const;
