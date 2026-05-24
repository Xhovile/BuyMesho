# Admin setup and moderation workspace

This document defines the first-time admin setup path and daily moderation flow for BuyMesho.

## 1) Environment alignment

Set both backend and frontend admin values to the same accounts:

- `ADMIN_UIDS` and `VITE_ADMIN_UIDS`
- `ADMIN_EMAILS` and `VITE_ADMIN_EMAILS`

Do not leave one side empty while using the other.

## 2) Claim-based access (optional)

If you use Firebase claims, the admin account should include either:

- `admin: true`, or
- `role: "admin"`

## 3) Access verification

After sign-in, verify these endpoints with an admin account token:

- `GET /api/admin/access`
- `GET /api/admin/summary`
- `GET /api/admin/actions`

## 4) TOTP/session expectations

If TOTP is enabled in your deployment, complete TOTP verification before sensitive admin actions.

## 5) Moderation queue workflow

Use **Admin → Moderation Queue** as first stop, then branch into:

- `Reports` for listing/problem moderation
- `Reports` (chat tab) for message moderation
- `Seller Applications` for pending onboarding reviews

## 6) Audit workflow

Use **Admin → Audit Log** to review recent admin actions and enforcement history.
