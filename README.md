# BuyMesho

**A campus-focused marketplace for university students in Malawi.**

BuyMesho helps students buy and sell products and services within their campus communities in a simple, practical, and secure way.

---

## Overview

BuyMesho is designed to make campus commerce easier.

Instead of acting like a noisy general marketplace, it focuses on:
- campus-based trust
- fast listing creation
- simple product discovery
- lightweight communication
- secure seller authentication

Sellers can create profiles and post listings. Buyers can browse by campus and category, then contact sellers directly through WhatsApp.

BuyMesho is intentionally **not** an in-app messaging platform.  
It uses WhatsApp redirection to keep the system lighter, simpler, and easier to manage.

---

## Why BuyMesho Exists

Students often sell and buy through scattered WhatsApp statuses, group chats, and word of mouth. That works, but it is messy and hard to search.

BuyMesho solves that by giving students one organized place to:
- discover items
- post listings
- compare options
- contact sellers quickly
- report suspicious content

The goal is to build a trusted campus marketplace that feels local, relevant, and easy to use.

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
- Create product or service listings
- Upload listing photos
- Add title, price, description, category, and university
- Add WhatsApp contact number
- View listings in a grid feed
- Filter by campus
- Filter by category
- Search listings
- Sort by newest or price

### Communication
- Buyers contact sellers directly through WhatsApp
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
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── README.md
