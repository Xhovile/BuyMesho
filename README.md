# BuyMesho

**A campus marketplace for university students in Malawi, built around internal messaging, secure checkout, and payment-led commerce.**

BuyMesho helps students buy, sell, and manage transactions within trusted campus communities through a clean marketplace flow.

---

## Overview

BuyMesho is designed to make campus commerce faster, safer, and easier to manage.

Instead of relying on scattered social posts or external contact channels, it focuses on:
- campus-based trust
- fast listing creation
- structured product discovery
- internal private messaging
- secure checkout and payment flow
- seller verification and moderation

Sellers can create profiles and post listings. Buyers can browse by campus and category, message sellers inside the platform, and complete purchases through the built-in commerce flow.

BuyMesho is no longer built around WhatsApp redirection. The product direction is now centered on in-app communication, payment handling, and stronger transaction control.

---

## Why BuyMesho Exists

Students often buy and sell through scattered social posts, group chats, and word of mouth. That works, but it is messy, hard to search, and difficult to manage once transactions become serious.

BuyMesho solves that by giving students one organized place to:
- discover items and services
- post listings
- compare options
- message sellers privately
- complete checkout
- track order status
- report suspicious content

The goal is to build a trusted campus marketplace that feels local, relevant, and practical.

---

## Core Features

### User Authentication
- Sign up with email and password
- Log in and log out
- Password reset
- Email verification
- Seller profile creation

### Seller Profiles
- Business or seller name
- Logo or profile image
- University or campus
- Short bio
- Trust and verification controls

### Listings
- Create product or service listings
- Upload listing photos
- Add title, price, description, category, and university
- View listings in a grid feed
- Filter by campus
- Filter by category
- Search listings
- Sort by newest or price
- Highlight featured or promoted listings

### Communication
- Internal private messaging between buyers and sellers
- Conversation threads tied to listings and user accounts
- No WhatsApp-based primary contact flow

### Commerce
- Buy Now flow
- Add to Cart flow
- Checkout flow
- Payment initialization
- Payment verification
- Order confirmation
- Escrow or release logic where applicable

### Safety
- Report listing feature
- Backend-protected authenticated routes
- Verified UID from Firebase tokens
- No client-controlled seller identity
- Moderation and trust controls
- Order and dispute handling support

---

## Tech Stack

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
- SQLite (`better-sqlite3`)
- Firebase Admin SDK

### Other Services
- Firebase Authentication
- Firebase Firestore
- Cloudinary for image hosting and uploads

---

## Current Development Status

BuyMesho is now being shaped around internal messaging and a payment-led purchase flow.

The current architecture below is the active direction for the commerce system, including payments, escrow, orders, and post-payment handling.

## Payment Gateway & Escrow Module Structure

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
    types/
      common.ts
      payment.ts
      listing.ts
      user.ts
    constants/
      app.ts
      payment.ts
      chips.ts
    hooks/
      useDebounce.ts
      useLocalStorage.ts
      usePagination.ts

  modules/
    listings/
      components/
      hooks/
      services/
      types.ts
      listingMapper.ts

    users/
      components/
      hooks/
      services/
      types.ts

    messaging/
      components/
      hooks/
      services/
      types.ts
      conversationService.ts

    payments/
      components/
      hooks/
      services/
      types.ts
      paymentGateway.ts
      providers/
        paystack.ts
        flutterwave.ts
        paychangu.ts

    escrow/
      ledger.ts
      states.ts
      releaseRules.ts
      disputes.ts

    orders/
      checkout.ts
      orderState.ts
      orderService.ts

    bookings/
      bookingService.ts
      bookingState.ts

    notifications/
      notifications.ts
      templates.ts
server/
  modules/
    messaging/
      messaging.service.ts
      messaging.controller.ts
      messaging.routes.ts
    payments/
      payment.service.ts
      payment.controller.ts
      payment.providers.ts
      payment.webhooks.ts
    escrow/
      escrow.service.ts
      escrow.ledger.ts
      escrow.rules.ts
    orders/
      order.service.ts
      order.routes.ts
    payouts/
      payout.service.ts
    disputes/
      dispute.service.ts
```

---

## Setup / Run Instructions

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd server
npm install
npm run dev
```

### Environment Variables
Create the required `.env` files for frontend and backend and configure:
- Firebase credentials
- database connection settings
- payment gateway keys
- image upload credentials
- webhook secrets

---

## Development Notes

- The marketplace is built to scale from campus trust into structured commerce.
- Internal messaging is part of the core product, not an add-on.
- Payment handling and escrow logic should stay aligned with order creation and verification.
- The codebase should keep listing discovery, messaging, and checkout as separate modules.

---

## Project Direction

BuyMesho is being developed as a serious marketplace product, not a social link directory.

The priority is to keep the platform:
- trustworthy
- searchable
- mobile-friendly
- transaction-ready
- easy to expand across campuses

---

## License

Private project. All rights reserved.
