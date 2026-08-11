import fs from "fs";
import path from "path";

function resolveFile(filePath, chooseSide) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  if (!content.includes("<<<<<<<")) {
    console.log(`No conflict markers in ${filePath}`);
    return;
  }

  // Regex to match standard 3-way or 2-way conflict blocks
  // <<<<<<< HEAD ... ======= ... >>>>>>> NewBuyMesho/main
  const conflictRegex = /<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> [^\n]+/g;

  if (chooseSide === "HEAD") {
    const headRegex = /<<<<<<< HEAD\n([\s\S]*?)=======\n[\s\S]*?>>>>>>> [^\n]+\n?/g;
    const resolved = content.replace(headRegex, "$1");
    fs.writeFileSync(fullPath, resolved, "utf-8");
    console.log(`Resolved ${filePath} using HEAD`);
  } else if (chooseSide === "INCOMING") {
    const incomingRegex = /<<<<<<< HEAD\n[\s\S]*?=======\n([\s\S]*?)>>>>>>> [^\n]+\n?/g;
    const resolved = content.replace(incomingRegex, "$1");
    fs.writeFileSync(fullPath, resolved, "utf-8");
    console.log(`Resolved ${filePath} using INCOMING (NewBuyMesho)`);
  }
}

// 1. Files where HEAD is authoritative (Production Infrastructure, Validator, Tickets, Payouts, Escrow)
const headAuthoritativeFiles = [
  "server/db/migrations/index.ts",
  "server/postgresCompat/schema.ts",
  "server/auth/sessionRoutes.ts",
  "server/auth/verificationEmailRoutes.ts",
  "server/auth/accountDeletionRoutes.ts",
  "server/middleware/requireAuth.ts",
  "server/routes/events.routes.ts",
  "server/routes/marketplace.routes.ts",
  "server/modules/admin/admin.summary.routes.ts",
  "server/modules/orders/order.repository.ts",
  "server/modules/payments/payment.admin.payout.display.routes.ts",
  "server/modules/payments/payment.admin.routes.ts",
  "server/modules/payments/payment.routes.ts",
  "server/modules/payouts/payout.repository.ts",
  "src/AdminPayoutDetailDrawer.tsx",
  "src/AdminPayoutsManager.tsx",
  "src/AdminReportsPage.tsx",
  "src/EventTicketTrackingPage.tsx",
  "src/TicketsPage.tsx",
  "src/MyListingsPage.tsx",
  "src/PayoutDetailDrawer.tsx",
  "src/PayoutQueueCard.tsx",
  "src/cart/useCartPageState.ts",
  "src/components/AccountPageShell.tsx",
  "src/components/AppFooter.tsx",
  "src/components/BecomeSellerModal.tsx",
  "src/components/ChangePasswordModal.tsx",
  "src/components/ReportListingModal.tsx",
  "src/components/ReportProblemPage.tsx",
  "src/components/ScrollToTopFab.tsx",
  "src/components/buyer/BuyerTicketCard.tsx",
  "src/components/eventDetails/EventActionsMenu.tsx",
  "src/components/eventDetails/EventDetailsActions.tsx",
  "src/components/eventDetails/EventDetailsView.tsx",
  "src/eventSchemas/core.ts",
  "src/hooks/useAccountProfile.ts",
  "src/hooks/useHomePageData.ts",
  "src/lib/buyerTickets.ts",
  "src/lib/installExploreFetchCache.ts",
  "src/ForgotPasswordPage.tsx",
];

for (const file of headAuthoritativeFiles) {
  resolveFile(file, "HEAD");
}

console.log("Head authoritative resolutions completed.");
