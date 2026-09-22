import PaymentForm from "./PaymentForm";
import ReceiptPage from "./ReceiptPage";
import XhovileStudioAdminPage from "./AdminPage";

export default function XhovileStudioPaymentPage() {
  const normalizedPath =
    window.location.pathname.replace(/\/+$/, "").toLowerCase() || "/";

  if (normalizedPath === "/services/xhovilestudio/admin") {
    return <XhovileStudioAdminPage />;
  }
  if (normalizedPath === "/services/xhovilestudio/receipt") {
    return <ReceiptPage />;
  }
  return <PaymentForm />;
}
