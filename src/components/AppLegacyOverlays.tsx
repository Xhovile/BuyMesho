import React from "react";
import ConfirmModal from "./ConfirmModal";
import FeedbackModal from "./FeedbackModal";
import EditListingModal from "./EditListingModal";
import ReportListingModal from "./ReportListingModal";
import ScrollToTopFab from "./ScrollToTopFab";
import type { AppLegacyState } from "../hooks/useAppLegacyState";

type AppLegacyOverlaysProps = Pick<
  AppLegacyState,
  | "reportListingId"
  | "setReportListingId"
  | "editingListing"
  | "setEditingListing"
  | "confirmState"
  | "setConfirmState"
  | "feedback"
  | "setFeedback"
  | "showScrollTop"
  | "handleUpdateListing"
  | "showFeedback"
>;

export default function AppLegacyOverlays({
  reportListingId,
  setReportListingId,
  editingListing,
  setEditingListing,
  confirmState,
  setConfirmState,
  feedback,
  setFeedback,
  showScrollTop,
  handleUpdateListing,
  showFeedback,
}: AppLegacyOverlaysProps) {
  return (
    <>
      {reportListingId !== null && (
        <ReportListingModal listingId={reportListingId} onClose={() => setReportListingId(null)} />
      )}

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSave={(updated) => handleUpdateListing(editingListing.id, updated)}
          showFeedback={showFeedback}
        />
      )}

      {confirmState && (
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          danger={confirmState.danger}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => confirmState.onConfirm?.()}
        />
      )}

      {feedback && (
        <FeedbackModal
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      <ScrollToTopFab
        show={showScrollTop}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />
    </>
  );
}
