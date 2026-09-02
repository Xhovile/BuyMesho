# BuyMesho Checkpoint Roadmap — 2 to 10

This directory documents the product and implementation contracts for the remaining BuyMesho restructuring checkpoints. Each checkpoint should be audited against the live repository before code changes are made.

## Checkpoints

| Checkpoint | Focus | Document |
|---|---|---|
| 2 | User Classification | `checkpoint-02-user-classification.md` |
| 3 | Seller Application | `checkpoint-03-seller-application.md` |
| 4 | Seller Information | `checkpoint-04-seller-information.md` |
| 5 | Seller Commitments & Marketplace Standards | `checkpoint-05-seller-commitments.md` |
| 6 | Student Deal Commitment | `checkpoint-06-student-deal-commitment.md` |
| 7 | Lay-by / Loan Seller Capabilities | `checkpoint-07-layby-loan-capabilities.md` |
| 8 | Unified Marketplace Structure | `checkpoint-08-unified-marketplace.md` |
| 9 | Seller Listing System | `checkpoint-09-seller-listing-system.md` |
| 10 | University Logic as an Extension Layer | `checkpoint-10-university-logic.md` |

## Working method

For each checkpoint:

1. Inspect the current repository.
2. Identify what is already implemented.
3. Identify gaps and conflicting legacy assumptions.
4. Define the required changes against the checkpoint document.
5. Implement on an isolated branch where appropriate.
6. Review the resulting diff before merging into `main`.

## Architectural direction

BuyMesho is a unified marketplace with a general-purpose account system. Student functionality is an additional layer, seller functionality is a separate capability, and public/non-student users remain first-class marketplace participants.

Checkpoint 1 established the general account foundation and authentication return-path behavior. These documents define the next nine checkpoints without assuming that every feature described in the original concept material is already present in the codebase.
