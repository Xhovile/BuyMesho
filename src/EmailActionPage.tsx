import { useEffect, useMemo, useState } from "react";
import AccountPageShell from "./components/AccountPageShell";
import FeedbackModal from "./components/FeedbackModal";
import { auth } from "./firebase";
import { navigateToPath } from "./lib/appNavigation";
import { applyPendingEmailActionCode } from "./lib/security";

type FeedbackState =
  | {
      open: boolean;
      type: "success" | "error" | "info";
      title: string;
      message: string;
    }
  | null;

export default function EmailActionPage() {
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [processing, setProcessing] = useState(true);
  const [redirectTarget, setRedirectTarget] = useState("/login");

  const oobCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("oobCode") || "";
  }, []);

  useEffect(() => {
    const run = async () => {
      const fallbackTarget = auth.currentUser ? "/settings?section=security" : "/login";
      setRedirectTarget(fallbackTarget);

      if (!oobCode) {
        setFeedback({
          open: true,
          type: "error",
          title: "Missing link data",
          message: "This email action link is missing its code.",
        });
        setProcessing(false);
        return;
      }

      const result = await applyPendingEmailActionCode(oobCode);
      if (result.ok) {
        setFeedback({
          open: true,
          type: "success",
          title: "Email updated",
          message: result.message || "Your email change has been completed successfully.",
        });
      } else {
        setFeedback({
          open: true,
          type: "error",
          title: "Could not complete email update",
          message: result.message,
        });
      }

      setProcessing(false);
    };

    void run();
  }, [oobCode]);

  const handleContinue = () => {
    setFeedback(null);
    navigateToPath(redirectTarget);
  };

  return (
    <AccountPageShell
      eyebrow="Security"
      title="Complete email change"
      description={
        processing
          ? "Verifying your email action link..."
          : "Your email action link has been processed."
      }
      backLabel="Back"
      onBack={() => navigateToPath(redirectTarget)}
    >
      <div className="p-8 space-y-4 w-full">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
          <p className="text-sm font-semibold text-zinc-900">
            {processing
              ? "Please wait while the link is checked."
              : "You can continue to your next screen now."}
          </p>
        </div>
      </div>

      {feedback && (
        <FeedbackModal
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          actions={[
            {
              label: "Continue",
              onClick: handleContinue,
            },
          ]}
          onClose={handleContinue}
        />
      )}
    </AccountPageShell>
  );
}
