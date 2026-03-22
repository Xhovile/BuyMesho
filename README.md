# BuyMesho

BuyMesho is a **campus-focused marketplace platform** built for university students in Malawi to **buy and sell products or services** within their campus communities.

It is designed to be simple, practical, and secure:

- Students can create seller profiles
- Sellers can post listings
- Buyers can browse listings by campus and category
- Buyers contact sellers directly through **WhatsApp**
- Users can report suspicious or inappropriate listings

BuyMesho is intentionally **not** an in-app messaging platform.  
Instead, it uses **WhatsApp redirection** to keep the system lighter, simpler, and easier to manage.

---

## Core Idea

The platform solves a basic but real problem:

> Students need a simple place to discover and sell items within their own university environment.

BuyMesho focuses on:

- campus-based trust
- fast listing creation
- lightweight communication
- simple product discovery
- secure seller authentication

---

## Features

### User Authentication
- Sign up with email and password
- Log in and log out
- Password reset
- Email verification
- Seller profile creation

### Seller Profiles
- Business/seller name
- Logo or profile image
- University/campus
- Short bio

### Listings
- Create product/service listings
- Upload listing photos
- Add title, price, description, category, and university
- Add WhatsApp contact number
- View listings in a grid feed
- Filter by campus
- Filter by category
- Search listings
- Sort by newest or price

### Communication
- Buyers contact sellers directly through **WhatsApp**
- No internal private messaging system

### Safety
- Report listing feature
- Backend-protected authenticated routes
- Verified UID from Firebase tokens
- No client-controlled seller identity

---

## Tech Stack

### Frontend
- React
- [TypeScript](https://www.typescriptlang.org/)
- Vite
- Tailwind CSS
- Firebase Client SDK

### Backend
- Node.js
- Express
- [TypeScript](https://www.typescriptlang.org/)
- SQLite (`better-sqlite3`)
- Firebase Admin SDK

### Other Services
- Firebase Authentication
- Firebase Firestore
- Cloudinary (image hosting/upload)

---

## Project Structure

```bash
.
├── src/                      # Frontend source files
│   ├── App.tsx
│   ├── firebase.ts
│   ├── constants.ts
│   ├── types.ts
│   └── ...
├── server/
│   ├── auth/
│   │   └── firebaseAdmin.ts
│   ├── middleware/
│   │   └── requireAuth.ts
│   └── types/
│       └── express.d.ts
├── server.ts                 # Main Express backend
├── package.json
├── tsconfig.json
└── README.md
