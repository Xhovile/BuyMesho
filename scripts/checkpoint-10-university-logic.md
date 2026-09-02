# Checkpoint 10 — University Logic as an Extension Layer

## Purpose
Prevent university-specific assumptions from controlling the architecture of BuyMesho.

## Target model
```text
BuyMesho
├── General Users
│   ├── Student Users
│   │   └── Student-specific information
│   └── Public Users
│       └── General information
├── Sellers
│   ├── Student Sellers
│   └── Public Sellers
└── Marketplace
    ├── Categories
    ├── Products / Listings
    ├── Orders
    ├── Delivery
    ├── Promotions
    └── Transactions
```

## Rules
- University information belongs to the Student layer where relevant.
- General account creation must not require university information.
- Public users remain first-class BuyMesho users.
- Seller functionality must work for both Student and Public sellers.
- The marketplace remains unified rather than university-partitioned.
- University-specific features are additive capabilities, not foundational dependencies.

## Acceptance criteria
- A public account can register, complete profile setup, browse, buy, message, and use supported marketplace functions without a university.
- A student can activate student-specific functionality without changing the core account model.
- Student seller functionality extends the seller system rather than creating a separate marketplace.
- University filters or student offers are applied only where the feature requires them.

## Architectural principle
University logic should appear at the exact points where it creates value—student verification, student offers, institution-specific features, or other explicitly student-oriented capabilities—while the rest of BuyMesho remains general-purpose.
