import { useEffect, useMemo, useRef, useState } from "react";
import { CirclePlus, HandCoins, MoreVertical, Share2 } from "lucide-react";
import type { Listing } from "../types";
import { apiFetch } from "../lib/api";
import { buildListingShareUrl } from "../lib/listingUrl";
import { EXPLORE_PATH, navigateBackOrPath, navigateToEditListing } from "../lib/appNavigation";
import ActionModal from "./ActionModal";

type ListingActionsMenuProps = {
  listing: Listing;
  currentUid?: string;
  isLoggedIn?: boolean;
  isSaved?: boolean;
  variant?: "card" | "detail";
  onReport: (id: number) => void;
  onDelete?: (id: number) => void | Promise<void>;
  onEdit?: (listing: Listing) => void;
  onHideSeller?: (uid: string) => void;
  onHideListing?: (listingId: number) => void;
  onToggleStatus?: (listing: Listing) => void | Promise<void>;
  onRecordSale?: (listing: Listing, quantity: number) => void | Promise<void>;
  onRestock?: (listing: Listing, quantity: number) => void | Promise<void>;
  requireLoginForContact?: () => void;
};

function loadIdList(storageKey: string, itemValidator: (value: unknown) => boolean) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(itemValidator) : [];
  } catch {
    return [];
  }
}

function saveIdList(storageKey: string, values: string[] | number[]) {
  localStorage.setItem(storageKey, JSON.stringify(values));
}

export default function ListingActionsMenu({
  listing,
  currentUid,
  isLoggedIn,
  variant = "card",
  onReport,
  onDelete,
  onEdit,
  onHideSeller,
  onHideListing,
  onToggleStatus,
  onRecordSale,
  onRestock,
  requireLoginForContact,
}: ListingActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<"record-sale" | "restock" | "delete" | "notice" | null>(null);
  const [quantityInput, setQuantityInput] = useState("1");
  const [dialogBusy, setDialogBusy] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const sellerUid = listing.seller_uid;
  const isOwner = !!currentUid && !!sellerUid && currentUid === sellerUid;
  const wrapperClassName = variant === "detail" ? "relative inline-flex" : "absolute right-3 top-3 z-20";

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const openNotice = (message: string) => {
    setNoticeMessage(message);
    setActiveDialog("notice");
  };

  const closeDialogs = () => {
    if (dialogBusy) return;
    setActiveDialog(null);
    setQuantityInput("1");
    setNoticeMessage("");
  };

  const resetDialogs = () => {
    setDialogBusy(false);
    setActiveDialog(null);
    setQuantityInput("1");
    setNoticeMessage("");
  };

  const handleCopyWhatsApp = async () => {
    if (!isLoggedIn) {
      setOpen(false);
      requireLoginForContact?.();
      return;
    }

    const number = listing.whatsapp_number || "";
    if (!number) {
      openNotice("No WhatsApp number found for this listing.");
      return;
    }

    try {
      await navigator.clipboard.writeText(number);
      openNotice("WhatsApp number copied.");
    } catch {
      openNotice(`Copy this number manually:\n${number}`);
    } finally {
      setOpen(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = buildListingShareUrl(listing.id, 0);
    const shareLines = [
      "BuyMesho Listing",
      listing.name,
      `Price: MK ${Number(listing.price).toLocaleString()}`,
      `Campus: ${listing.university}`,
    ];

    if (isLoggedIn && listing.whatsapp_number) {
      shareLines.push(`WhatsApp: ${listing.whatsapp_number}`);
    }

    shareLines.push("", `Open this listing: ${shareUrl}`);
    const shareText = shareLines.join("\n");

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: `BuyMesho: ${listing.name}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        openNotice("Share text copied.");
      }
    } catch {
      openNotice("Could not open the system share sheet. Copy the listing details from the page.");
    } finally {
      setOpen(false);
    }
  };

  const handleEdit = () => {
    setOpen(false);
    if (onEdit) {
      onEdit(listing);
      return;
    }
    navigateToEditListing(listing.id);
  };

  const handleDelete = () => {
    setOpen(false);
    setQuantityInput("1");
    setActiveDialog("delete");
  };

  const submitDelete = async () => {
    if (dialogBusy) return;
    setDialogBusy(true);
    try {
      if (onDelete) {
        await onDelete(listing.id);
      } else {
        await apiFetch(`/api/listings/${listing.id}`, { method: "DELETE" });
        navigateBackOrPath(EXPLORE_PATH);
      }
      resetDialogs();
    } catch (error: any) {
      setDialogBusy(false);
      setNoticeMessage(error?.message || "Failed to delete listing.");
      setActiveDialog("notice");
    }
  };

  const handleToggleStatus = async () => {
    setOpen(false);
    if (onToggleStatus) {
      await onToggleStatus(listing);
      return;
    }

    const nextStatus = listing.status === "sold" ? "available" : "sold";
    try {
      await apiFetch(`/api/listings/${listing.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      openNotice(`Listing marked as ${nextStatus}.`);
    } catch (error: any) {
      openNotice(error?.message || "Failed to update listing status.");
    }
  };

  const submitQuantityAction = async (action: "record-sale" | "restock") => {
    if (dialogBusy) return;

    const qty = Number(quantityInput);
    if (!Number.isInteger(qty) || qty <= 0) {
      setActiveDialog("notice");
      setNoticeMessage("Enter a valid quantity greater than zero.");
      return;
    }

    setDialogBusy(true);
    try {
      if (action === "record-sale") {
        if (onRecordSale) {
          await onRecordSale(listing, qty);
        } else {
          await apiFetch(`/api/listings/${listing.id}/record-sale`, {
            method: "POST",
            body: JSON.stringify({ quantity: qty }),
          });
        }
        openNotice("Sale recorded successfully.");
      } else {
        if (onRestock) {
          await onRestock(listing, qty);
        } else {
          await apiFetch(`/api/listings/${listing.id}/restock`, {
            method: "POST",
            body: JSON.stringify({ quantity: qty }),
          });
        }
        openNotice("Listing restocked successfully.");
      }
      setActiveDialog("notice");
    } catch (error: any) {
      setActiveDialog("notice");
      setNoticeMessage(error?.message || `Failed to ${action === "record-sale" ? "record sale" : "restock listing"}.`);
    } finally {
      setDialogBusy(false);
    }
  };

  const handleRecordSale = () => {
    setOpen(false);
    setQuantityInput("1");
    setActiveDialog("record-sale");
  };

  const handleRestock = () => {
    setOpen(false);
    setQuantityInput("1");
    setActiveDialog("restock");
  };

  const handleHideListing = () => {
    setOpen(false);
    if (onHideListing) {
      onHideListing(listing.id);
      return;
    }

    const hiddenListingIds = loadIdList("hiddenListingIds", (value) => Number.isInteger(value)) as number[];
    if (!hiddenListingIds.includes(listing.id)) {
      saveIdList("hiddenListingIds", [...hiddenListingIds, listing.id]);
    }
    navigateBackOrPath(EXPLORE_PATH);
  };

  const handleHideSeller = () => {
    setOpen(false);
    if (!sellerUid) return;
    if (onHideSeller) {
      onHideSeller(sellerUid);
      return;
    }

    const hiddenSellerUids = loadIdList("hiddenSellerUids", (value) => typeof value === "string") as string[];
    if (!hiddenSellerUids.includes(sellerUid)) {
      saveIdList("hiddenSellerUids", [...hiddenSellerUids, sellerUid]);
    }
    navigateBackOrPath(EXPLORE_PATH);
  };

  const menuLabel = useMemo(() => (isOwner ? "Listing actions" : "More options"), [isOwner]);

  return (
    <>
      <div ref={wrapperRef} className={wrapperClassName}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-sm backdrop-blur-md transition-all hover:bg-white"
          aria-label={menuLabel}
          aria-expanded={open}
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {open ? (
          <div
            className={`absolute ${variant === "detail" ? "right-0 top-full mt-2 w-72 z-[70]" : "right-0 top-12 w-56"} overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl`}
          >
            <div className="border-b border-zinc-100 px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
              {isOwner ? "Owner tools" : "Actions"}
            </div>

            {isOwner ? (
              <>
                <button type="button" onClick={handleEdit} className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                  Edit listing
                </button>
                <button type="button" onClick={handleRecordSale} className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                  <span className="inline-flex items-center gap-2"><HandCoins className="w-4 h-4" />Record sale</span>
                </button>
                <button type="button" onClick={handleRestock} className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                  <span className="inline-flex items-center gap-2"><CirclePlus className="w-4 h-4" />Restock</span>
                </button>
                <button type="button" onClick={handleToggleStatus} className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                  {listing.status === "sold" ? "Mark as available" : "Mark as sold"}
                </button>
                <button type="button" onClick={handleDelete} className="block w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                  Delete listing
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onReport(listing.id);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  Report listing
                </button>
                <button type="button" onClick={handleCopyWhatsApp} className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                  Copy WhatsApp number
                </button>
                <button type="button" onClick={handleShare} className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                  <span className="inline-flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share listing
                  </span>
                </button>
                <button type="button" onClick={handleHideListing} className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                  Hide this listing
                </button>
                <div className="h-px bg-zinc-100" />
                <button type="button" onClick={handleHideSeller} className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50" disabled={!sellerUid}>
                  Hide this seller
                </button>
              </>
            )}

            {variant === "detail" && !isOwner ? (
              <div className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
                Use this menu for quick account actions.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ActionModal
        open={activeDialog === "record-sale"}
        title="Record sale"
        message={`Record how many units of “${listing.name}” were sold.`}
        confirmLabel="Record sale"
        cancelLabel="Back"
        loading={dialogBusy}
        danger={false}
        inputLabel="Quantity sold"
        inputValue={quantityInput}
        inputPlaceholder="1"
        onInputChange={setQuantityInput}
        onConfirm={() => void submitQuantityAction("record-sale")}
        onCancel={closeDialogs}
      />

      <ActionModal
        open={activeDialog === "restock"}
        title="Restock listing"
        message={`Add stock back to “${listing.name}”.`}
        confirmLabel="Restock"
        cancelLabel="Back"
        loading={dialogBusy}
        danger={false}
        inputLabel="Quantity to add"
        inputValue={quantityInput}
        inputPlaceholder="1"
        onInputChange={setQuantityInput}
        onConfirm={() => void submitQuantityAction("restock")}
        onCancel={closeDialogs}
      />

      <ActionModal
        open={activeDialog === "delete"}
        title="Delete listing"
        message={`Delete “${listing.name}”? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={dialogBusy}
        danger
        onConfirm={() => void submitDelete()}
        onCancel={closeDialogs}
      />

      <ActionModal
        open={activeDialog === "notice"}
        title="Notice"
        message={noticeMessage}
        confirmLabel="Okay"
        cancelLabel="Close"
        loading={dialogBusy}
        onConfirm={closeDialogs}
        onCancel={closeDialogs}
      />
    </>
  );
}
