import React from "react";
import { FileText } from "lucide-react";

type Props = {
  onBack: () => void;
};

export default function TermsPage({ onBack }: Props) {
  return (
    <div className="p-6 overflow-y-auto flex-1">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold"
      >
        ← Back to Settings
      </button>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-zinc-700" />
          <h2 className="text-2xl font-extrabold text-zinc-900">Terms of Use</h2>
        </div>

        <div className="space-y-4 text-sm text-zinc-700 leading-7">
          <p>
            BuyMesho is a campus-focused marketplace platform for student communities. Users are responsible
            for the content they post, the accuracy of their listings, and the conduct of their transactions.
          </p>

          <p>
            You may not post illegal, misleading, stolen, harmful, or inappropriate items or services. You
            may not impersonate another seller or attempt to bypass platform security.
          </p>

          <p>
            BuyMesho is not a direct party to transactions between buyers and sellers. Users are responsible
            for verifying products, pricing, payment arrangements, and delivery terms.
          </p>

          <p>
            BuyMesho reserves the right to remove listings, restrict access, or delete accounts where misuse,
            abuse, fraud, or suspicious conduct is detected.
          </p>

          <p>
            Continued use of the platform means you accept these terms and any reasonable future updates.
          </p>
        </div>
      </div>
    </div>
  );
}
