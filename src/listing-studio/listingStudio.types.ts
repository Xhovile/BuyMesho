import type { CreateListingPayload, ListingDraft } from "../types";

export type ListingStudioFeedbackType = "success" | "error" | "info";

export type ListingStudioFormProps = {
  mode: "create" | "edit";
  initialData: ListingDraft;
  draftStorageKey?: string;
  onCancel: () => void;
  onSubmit: (payload: CreateListingPayload) => Promise<void> | void;
  showFeedback: (
    type: ListingStudioFeedbackType,
    title: string,
    message: string
  ) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submitBusyLabel?: string;
};
