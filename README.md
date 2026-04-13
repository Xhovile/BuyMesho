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

## SPA Route Fallback (Avoid 404 on Refresh/Deep Links)

This project uses client-side routing, so hosts must always serve `index.html` for non-file routes.

- `vercel.json` adds a filesystem-first route and then falls back to `index.html`.
- `public/_redirects` adds Netlify-style SPA fallback: `/* /index.html 200`.

Without these rewrites, opening or refreshing deep URLs like `/explore`, `/settings`, or `/listing?...` can return a host-level 404.

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

---

## Known Behaviors & QA Edge Cases

The following behaviors are intentional in the current implementation and should be validated in frontend UX and QA flows.

### 1) "Useful fields" in filters are heuristic and capped
- Spec filter fields shown in the filter panel are selected from schema fields using keyword-priority matching on field key/label.
- Only select, multiselect, and boolean fields are considered.
- The list is capped to a small fixed set (currently 6 fields).
- Result: some schemas may show different fields than expected if labels/keys do not match priority terms closely.

What to review:
- Confirm each major category/subcategory/item-type combo still surfaces the most useful filter controls for end users.
- Confirm hidden-but-available schema fields are acceptable under this capping strategy.

### 2) Backend spec filter parsing is intentionally strict/safe
- Spec filters are parsed from query JSON and sanitized.
- Only string, boolean, and string-array values are accepted.
- Malformed/unsupported values are ignored (instead of causing broad query failures).

What to review:
- Confirm API clients and frontend do not rely on unsupported value types.
- Confirm invalid filter payloads fail "softly" (ignored) without breaking listing search.

### 3) Multiselect filter semantics are OR-style
- For multiselect spec filters, matching uses "any selected value" logic.
- This means a listing is returned when it contains at least one selected option.

What to review:
- Confirm product expectations align with OR-style membership.
- If "must include all selected values" is required, update SQL to AND-style matching before release.

### 4) Related listings endpoint returns 404 for missing listing IDs
- `/api/listings/:id/related` returns `404 Listing not found` if the source listing does not exist.

What to review:
- Confirm stale/deleted listing URLs are handled gracefully by frontend UX (no broken modal/page experience).

### 5) Related listing ranking uses minimal signal set
- Current related listing ranking prioritizes:
  1. same category and university (hard filter)
  2. exact subcategory match
  3. exact item_type match
  4. available before sold-out
  5. newest first
- Richer relevance signals are intentionally not included yet.

What to review:
- Confirm ranking quality is acceptable for current release goals.
- Track user feedback for future ranking improvements (price bands, seller quality, engagement, semantic similarity, etc.).

### Suggested QA checks (quick pass)
1. Create listings with diverse schema labels and verify filter fields shown are still useful.
2. Send malformed `specFilters` JSON and confirm listings endpoint still returns safely.
3. Apply multiselect filters with 2+ options and verify OR behavior.
4. Hit related endpoint with valid and invalid listing IDs and verify expected UX paths.
5. Verify related listing order for near-identical category listings across subcategory/item_type combinations.
