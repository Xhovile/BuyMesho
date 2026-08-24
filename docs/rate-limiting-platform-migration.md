# Platform rate limiting migration

BuyMesho now uses `@xhovile/platform/rate-limit` for its rate-limiting mechanism. Application policies remain defined here.

## Migrated policies

- AI public: 10/min by IP
- AI authenticated: 20/min by user
- Admin API: 60/min by IP
- Login email check: 20/15min by IP
- Password reset: 5/15min by IP
- Email change: 5/15min by IP
- Verification email resend: 3/10min by user/IP fallback
- Passkey registration: 20/15min by IP
- Passkey login: 30/15min by IP
- Checkout: 10/min by IP
- Public payment status: 60/min by IP
- Payment webhooks: 200/min by IP
- Payout webhooks: 200/min by IP
- Message send: 30/min by user
- Message report: 10/min by user
- Validator API: 120/min by IP
- Escrow/dispute/payout actions: existing policies preserved through the shared Platform-backed middleware

All Platform-backed stores currently fail closed. Redis remains a future deployment option for multi-instance BuyMesho.
