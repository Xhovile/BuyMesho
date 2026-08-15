# BuyMesho Passkeys

BuyMesho uses `@xhovile/platform` for WebAuthn/passkey ceremonies and keeps application identity in Firebase Authentication.

## Environment

Configure these server-side variables for the BuyMesho deployment:

```env
PASSKEY_RP_NAME=BuyMesho
PASSKEY_RP_ID=your-production-hostname
PASSKEY_ORIGIN=https://your-production-hostname
```

`PASSKEY_RP_ID` must match the WebAuthn relying-party ID for the site. `PASSKEY_ORIGIN` must be the exact browser origin used by BuyMesho. Do not use a development value in production.

## Storage

BuyMesho stores WebAuthn credentials and short-lived ceremonies in PostgreSQL through the existing database compatibility layer. The tables are created by `initPaymentSchema`:

- `passkey_credentials`
- `passkey_ceremonies`

Private passkey keys never enter the BuyMesho database. Only the credential ID, public key, counter, transport metadata, and device metadata are stored.

## Authentication flows

### Registration

1. An authenticated Firebase user requests registration options.
2. Platform generates a discoverable, user-verified credential ceremony.
3. The browser creates the passkey using the device authenticator.
4. Platform verifies the WebAuthn response.
5. BuyMesho stores the verified credential against the Firebase UID.

### Sign-in

1. The browser requests discoverable authentication options without supplying an email.
2. The device selects and verifies the passkey.
3. Platform verifies the assertion and resolves the stored Firebase UID.
4. BuyMesho creates a short-lived Firebase custom token for that UID.
5. The client signs in with the custom token and enters the existing BuyMesho session flow.

## Security boundaries

- Platform owns WebAuthn ceremony generation and cryptographic verification.
- BuyMesho owns credential persistence and Firebase account linking.
- Existing password + TOTP authentication remains unchanged.
- Passkey login is rate-limited.
- Credential counters are updated after successful authentication.
- Revoked credentials are excluded from authentication.
