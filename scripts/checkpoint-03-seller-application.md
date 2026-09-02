# Checkpoint 3 — Seller Application

## Purpose
Separate ordinary BuyMesho account creation from the process of becoming an approved seller.

## Product rules
- Any general BuyMesho user may apply to become a seller.
- Seller application is a second process after account creation.
- The application must identify the applicant, what they intend to sell, and the information required to verify them.
- Verification requirements must depend on the applicant and seller type; do not require every possible document from every applicant.

## Potential verification information
- Full name
- Phone number
- Email
- National ID
- Passport, where applicable
- Business certificate, where applicable
- Student ID / student number / student email, where applicable

## Workflow
General account → Seller application → Review / verification → Approval or rejection → Seller capabilities.

## Acceptance criteria
- Ordinary users are not treated as sellers automatically.
- Seller application state is explicit.
- Verification documents are handled securely.
- Approval is required before seller-only capabilities are enabled.
- Rejected applications provide an actionable status without corrupting the base user account.

## Implementation note
Seller application data should extend the general user identity instead of duplicating the user's core identity unnecessarily.
