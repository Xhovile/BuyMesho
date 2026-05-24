import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

const SETUP_ITEMS = [
  "Set ADMIN_UIDS/ADMIN_EMAILS and matching VITE_ADMIN_UIDS/VITE_ADMIN_EMAILS.",
  "Ensure Firebase custom claim (admin or role=admin) is applied if using claim-based access.",
  "Confirm admin account can call /api/admin/access successfully.",
  "If TOTP is enabled, ensure admin session includes x-buymesho-totp-session header after verification.",
  "Verify moderation routes: /api/admin/reports, /api/admin/message-reports, /api/admin/seller-applications.",
  "Verify operational routes: /api/admin/payments, /api/admin/payouts, /api/admin/actions.",
];

export default function AdminSetupPage() {
  return (
    <AdminWorkspaceLayout
      title="Admin Setup Checklist"
      description="Use this checklist for first-time admin onboarding and environment verification."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ol className="list-decimal space-y-3 pl-5 text-sm text-zinc-700">
          {SETUP_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </AdminWorkspaceLayout>
  );
}
