import PaymentForm from "./PaymentForm";
import ReceiptPage from "./ReceiptPage";

export default function XhovileStudioPaymentPage() {
  const isReceipt = window.location.pathname === "/Services/XhovileStudio/receipt";
  return isReceipt ? <ReceiptPage /> : <PaymentForm />;
}
