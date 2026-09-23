import PaymentForm from "./PaymentForm";
import ReceiptPage from "./ReceiptPage";
import XhovileStudioAdminPage from "./AdminPage";

export default function XhovileStudioPaymentPage() {
  const normalizedPath =
    window.location.pathname.replace(/\/+$/, "").toLowerCase() || "/";

  if (normalizedPath === "/services/xhovilestudio") {
    window.location.replace("/xhovilestudio");
    return null;
  }
  if (normalizedPath === "/services/xhovilestudio/admin") {
    window.location.replace("/xhovilestudio/admin");
    return null;
  }
  if (normalizedPath === "/services/xhovilestudio/receipt") {
    window.location.replace(`/xhovilestudio/receipt${window.location.search}`);
    return null;
  }
  if (normalizedPath === "/xhovilestudio/admin") {
    return <XhovileStudioAdminPage />;
  }
  if (normalizedPath === "/xhovilestudio/receipt") {
    return <ReceiptPage />;
  }
  return <PaymentForm />;
}
