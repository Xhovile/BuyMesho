# BuyMesho

**A campus marketplace for university students in Malawi, built around internal messaging, secure checkout, and payment-led commerce.**

## Overview 

BuyMesho helps students buy, sell, and manage transactions within trusted campus communities through a clean marketplace flow.

Instead of relying on scattered social posts or external contact channels, the product focuses on:
- campus-based trust
- fast listing creation
- structured product discovery
- internal private messaging
- secure checkout and payment flow
- seller verification and moderation

Sellers can create profiles and post listings. Buyers can browse by campus and category, message sellers inside the platform, and complete purchases through the built-in commerce flow.

## Core features

- User authentication and email verification
- Seller profile creation and editing
- Listing creation, browsing, search, and filtering
- Featured and promoted listings
- Internal messaging between buyers and sellers
- Checkout flow for orders and payments
- Payment verification and order confirmation
- Escrow-related order handling
- Reporting and moderation support

## Communication

BuyMesho uses internal messaging as the primary communication layer.

- Conversations are tied to listings and user accounts
- Buyers and sellers can communicate without leaving the platform
- Messaging is designed to support trust, traceability, and moderation

## Commerce

The commerce flow is centered on checkout, payment initialization, verification, and order state updates.

- Buy Now flow
- Add to Cart flow
- Checkout modal for purchase initiation
- Payment initialization through the backend
- Payment verification on the return page
- Order confirmation after successful payment
- Escrow handoff when payment is captured

## Safety

Trust and platform control are part of the core system.

- Report listing feature
- Backend-protected authenticated routes
- Verified UID from Firebase tokens
- No client-controlled seller identity
- Moderation and trust controls
- Order and dispute handling support

## Admin workspace setup

- Admin setup and moderation guide: `docs/admin-setup-and-moderation.md`

## Tech stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Firebase Client SDK

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL (Aiven)
- Firebase Admin SDK

### Other services
- Firebase Authentication
- Firebase Firestore
- Cloudinary for image hosting and uploads

## Current development status

BuyMesho is now shaped around internal messaging and a payment-led purchase flow.

The current checkout path is already wired through the app:
- `CheckoutModal` posts to `/api/payments/checkout` with listing, quantity, buyer, return URL, and cancel URL data.
- `PaymentReturnPage` reads `tx_ref` from the URL and verifies the payment server-side.
- The payment service and webhook flow update the order and payment state after successful capture.
- When payment is confirmed, the order is moved into escrow handling on the server.

## Database configuration

- The app reads `DATABASE_URL` from the environment.
- Aiven PostgreSQL should be used with SSL enabled.
- Keep the database credentials out of version control.

## Payment Gateway & Escrow module structure

```bash
src/
  shared/
    api/
      client.ts
      endpoints.ts
      errors.ts
    auth/
      authContext.tsx
      useAuth.ts
      guards.ts
    ui/
      Button.tsx
      Input.tsx
      Modal.tsx
      Loader.tsx
      EmptyState.tsx
    utils/
      formatMoney.ts
      formatDate.ts
      slugify.ts
      ids.ts
```
