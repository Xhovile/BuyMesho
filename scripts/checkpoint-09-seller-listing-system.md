# Checkpoint 9 — Seller Listing System

## Purpose
Give every approved seller one consistent listing system, while keeping student-specific behavior conditional rather than duplicating the marketplace.

## Create Listing
A seller should be able to provide relevant listing information including:
- Product name
- Category and subcategory
- Description
- Price
- Product images
- Quantity / stock
- Seller location
- Delivery information
- Available deals or promotions
- Relevant selling options

## Edit Listing
The seller must be able to:
- Change price
- Change description
- Replace or update images
- Change stock
- Update availability
- Modify applicable offers

## Rules
- Both Student and Public sellers use the same core listing system.
- Student-specific fields or logic appear only when relevant.
- Listing ownership must be enforced server-side.
- Listings must respect marketplace moderation, authenticity, availability, and category rules.

## Acceptance criteria
- Approved sellers can create, save, edit, and manage their own listings.
- Buyers see a consistent product presentation regardless of seller type.
- Inventory and availability changes are reflected reliably.
- Seller cannot modify another seller's listing.
- Listing state integrates with search, category pages, seller profiles, cart, checkout, orders, and promotions.
