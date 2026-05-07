import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";

type PaymentRow = {
  id: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  verified: number;
  created_at: string;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await apiFetch("/api/admin/payments");
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black">
          Payments & Webhooks
        </h1>

        <div className="mt-6 bg-white border border-zinc-200 rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left p-4">Reference</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Verified</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Created</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-t border-zinc-100"
                >
                  <td className="p-4 font-mono text-sm">
                    {payment.reference}
                  </td>

                  <td className="p-4">
                    {payment.status}
                  </td>

                  <td className="p-4">
                    {payment.verified ? "Verified" : "Pending"}
                  </td>

                  <td className="p-4">
                    {payment.currency} {payment.amount}
                  </td>

                  <td className="p-4 text-sm text-zinc-500">
                    {new Date(payment.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && payments.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No payments found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
