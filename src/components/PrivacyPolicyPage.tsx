import React from "react";
import { FileText, X } from "lucide-react";

type Props = {
  onBack: () => void;
  onClose: () => void;
  showBackButton?: boolean;
};

export default function PrivacyPolicyPage({
  onBack,
  onClose,
  showBackButton = true,
}: Props) {
  return (
    <div className="p-6 overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        {showBackButton ? (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold"
          >
            ← Back to Settings
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-zinc-700" />
          <h2 className="text-2xl font-extrabold text-zinc-900">Privacy Policy</h2>
        </div>

        <div className="space-y-4 text-sm text-zinc-700 leading-7">
          <p>
            BuyMesho collects basic account and marketplace information needed to operate the platform.
            This may include your email address, seller profile details, campus, listing information,
            uploaded images, and WhatsApp contact number.
          </p>

          <p>
            Your public seller information may be visible to other users when you post listings. This can
            include your business name, logo, campus, bio, listing content, and contact number if attached
            to listings.
          </p>

          <p>
            BuyMesho uses Firebase Authentication for sign-in and account identity, and may use third-party
            storage or hosting tools to manage uploaded media and platform infrastructure.
          </p>

          <p>
            We do not promise complete prevention of misuse, but we take reasonable steps to protect routes,
            verify seller ownership, and prevent unauthorized listing actions.
          </p>

          <p>
            By using BuyMesho, you agree that you are responsible for the accuracy of your information and
            for using the platform in a lawful and respectful manner.
          </p>
        </div>
      </div>
    </div>
  );
}
