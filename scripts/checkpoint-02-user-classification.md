# Checkpoint 2 — User Classification

## Purpose
Make BuyMesho account type a general identity layer: every account is created as a normal BuyMesho account first, then classified as either Student or Public / Non-Student.

## Product rules
- Student status is optional and must not be required during initial account creation.
- Public / Non-Student users must be fully usable without university information.
- Student-specific information appears only after the user selects Student.
- Classification should be stored on the user profile and remain editable through the appropriate profile flow.

## Student information
When the user selects Student, collect only the student fields required by BuyMesho, such as institution, student ID, student number, student email, campus, and other relevant verification information.

## Public / Non-Student information
Do not display or require student-only fields.

## Acceptance criteria
- A public user can complete profile setup without providing university or student credentials.
- A student user can add student information after selecting Student.
- Student-only UI and validation are conditional.
- Existing buyer, checkout, messaging, and marketplace flows continue to work for both user types.

## Implementation note
This checkpoint builds on the general account foundation established in Checkpoint 1. It must not turn university data back into a universal account requirement.
