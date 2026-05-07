import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Listing, RatingSummary } from "./types";
import { apiFetch } from "./lib/api";
import {
  EXPLORE_PATH,
  LOGIN_PATH,
  REPORT_PATH,
  navigateBackOrPath,
  navigateToEditListing,
  navigateToLogin,
  navigateToPath,
} from "./lib/appNavigation";
import { buildListingShareUrl, getListingParamsFromUrl, syncListingParamsInUrl } from "./lib/listingUrl";
import { getListingItemConfig } from "./listingSchemas";
import { useAuthUser } from "./hooks/useAuthUser";
import { fetchListingById } from "./lib/listings";
import { isListingSaved, subscribeToSavedListingChanges, toggleSavedListingId } from "./lib/savedListings";
import { navigateToConversation } from "./lib/messagesNavigation";
import { startConversationFromListing } from "./lib/messages";
import ListingActionsMenu from "./components/ListingActionsMenu";
import FeedbackModal from "./components/FeedbackModal";
+import ConfirmModal from "./components/ConfirmModal";
import ListingGallery from "./components/listingDetails/ListingGallery";
import ListingSummary from "./components/listingDetails/ListingSummary";
import ListingOffersBlock from "./components/listingDetails/ListingOffersBlock";
import ListingSpecsBlock, { type ListingSpecsGroup } from "./components/listingDetails/ListingSpecsBlock";
import ListingExploreBlock from "./components/listingDetails/ListingExploreBlock";
import ListingReviewsBlock from "./components/listingDetails/ListingReviewsBlock";
import ListingSectionTabs from "./components/listingDetails/ListingSectionTabs";
import ListingDetailsBlock from "./components/listingDetails/ListingDetailsBlock";
import ListingTrustBlock from "./components/listingDetails/ListingTrustBlock";
import ListingHeaderBar from "./components/listingDetails/ListingHeaderBar";
import ListingStatusPanel from "./components/listingDetails/ListingStatusPanel";
import CheckoutModal from "./components/CheckoutModal";
@@
 export default function ListingDetailsPage() {
   const { user: firebaseUser } = useAuthUser();
@@
   const [shareNoticeMessage, setShareNoticeMessage] = useState("");
   const [activeSection, setActiveSection] = useState<SectionKey>("details");
   const [checkoutOpen, setCheckoutOpen] = useState(false);
+  const [authPromptOpen, setAuthPromptOpen] = useState(false);
+  const [authPromptAction, setAuthPromptAction] = useState<"message" | "buy" | null>(null);
@@
   const openShareNotice = (message: string) => {
     setShareNoticeMessage(message);
     setShareNoticeOpen(true);
   };
+
+  const openAuthPrompt = (action: "message" | "buy") => {
+    setAuthPromptAction(action);
+    setAuthPromptOpen(true);
+  };
+
+  const closeAuthPrompt = () => {
+    setAuthPromptOpen(false);
+    setAuthPromptAction(null);
+  };
+
+  const continueToAuth = () => {
+    closeAuthPrompt();
+    navigateToLogin();
+  };
@@
   const handleBuyNow = () => {
     if (!firebaseUser) {
-      navigateToPath(LOGIN_PATH);
+      openAuthPrompt("buy");
       return;
     }
     setCheckoutOpen(true);
   };
 
   const handleMessageSeller = async () => {    if (!listing) return;
     if (!firebaseUser) {
-      navigateToPath(LOGIN_PATH);
+      openAuthPrompt("message");
       return;
     }
@@
                         onToggleStatus={handleDetailToggleStatus}
                         onRecordSale={handleDetailRecordSale}
                         onRestock={handleDetailRestock}
-                        requireLoginForContact={() => navigateToPath(LOGIN_PATH)}
+                        requireLoginForContact={navigateToLogin}
                       />
                     }
                   />
@@
       <FeedbackModal open={shareNoticeOpen} type="info" title="Notice" message={shareNoticeMessage} onClose={() => setShareNoticeOpen(false)} />
+
+      <ConfirmModal
+        open={authPromptOpen}
+        title={authPromptAction === "buy" ? "Sign in to buy" : "Sign in to message"}
+        message={
+          authPromptAction === "buy"
+            ? "You need to sign in or create an account before you can buy this listing."
+            : "You need to sign in or create an account before you can message the seller."
+        }
+        confirmText="Continue"
+        cancelText="Cancel"
+        onCancel={closeAuthPrompt}
+        onConfirm={continueToAuth}
+      />
 
       {listing && (
         <CheckoutModal
           listing={listing}
*** End Patch