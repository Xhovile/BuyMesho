import PaymentForm from "./PaymentForm";
import ReceiptPage from "./ReceiptPage";
import XhovileStudioAdminPage from "./AdminPage";

export default function XhovileStudioPaymentPage() {
  const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/Services/XhovileStudio/Admin") {
    return <XhovileStudioAdminPage />;
  }
  if (normalizedPath === "/Services/XhovileStudio/receipt") {
    return <ReceiptPage />;
  }
  return <PaymentForm />;
}
