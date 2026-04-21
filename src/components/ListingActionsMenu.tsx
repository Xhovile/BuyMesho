import { useEffect, useMemo, useRef, useState } from "react";
import { CirclePlus, HandCoins, MoreVertical, Share2 } from "lucide-react";
import type { Listing } from "../types";
import { apiFetch } from "../lib/api";
import { buildListingShareUrl } from "../lib/listingUrl";
import { EXPLORE_PATH, navigateBackOrPath, navigateToEditListing } from "../lib/appNavigation";
import ActionModal from "./ActionModal";

type StockActionResponse = {
  listing?: Listing;
  available_quantity?: number;
};

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
  onRecordSale?: (listing: Listing, quantity: number) => Promise<StockActionResponse | void> | StockActionResponse | void;
  onRestock?: (listing: Listing, quantity: number) => Promise<StockActionResponse | void> | StockActionResponse | void;
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

const getAvailableQuantity = (listing: Listing) =>
  Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0));

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
  const currentAvailable = getAvailableQuantity(listing);

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

  const submitQuantityAction = async (action: "record-sale" | "restock") => {
    if (dialogBusy) return;

    const qty = Number(quantityInput);
    if (!Number.isInteger(qty) || qty <= 0) {
      setActiveDialog("notice");
      setNoticeMessage("Enter a valid quantity greater than zero.");
      return;
    }

    if (action === "record-sale" && qty > currentAvailable) {
      setActiveDialog("notice");
      setNoticeMessage(`You only have ${currentAvailable} left in stock.`);
      return;
    }

    setDialogBusy(true);
    try {
      let response: StockActionResponse | void;

      if (action === "record-sale") {
        response = onRecordSale
          ? await onRecordSale(listing, qty)
          : (await apiFetch(`/api/listings/${listing.id}/record-sale`, {
              method: "POST",
              body: JSON.stringify({ quantity: qty }),
            })) as StockActionResponse;
      } else {
        response = onRestock
          ? await onRestock(listing, qty)
          : (await apiFetch(`/api/listings/${listing.id}/restock`, {
              method: "POST",
              body: JSON.stringify({ quantity: qty }),
            })) as StockActionResponse;
      }

      const nextListing = response && typeof response === "object" && response.listing ? response.listing : null;
      const nextAvailable =
        response && typeof response === "object" && typeof response.available_quantity === "number"
          ? response.available_quantity
          : nextListing
            ? getAvailableQuantity(nextListing)
            : action === "record-sale"
              ? Math.max(0, currentAvailable - qty)
              : currentAvailable + qty;

      setActiveDialog("notice");
      setNoticeMessage(
        action === "record-sale"
          ? `Sale recorded. Remaining stock: ${nextAvailable}.`
          : `Restocked successfully. Remaining stock: ${nextAvailable}.`
      );
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
      <div
        ref={wrapperRef}
        className={wrapperClassName}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((prev) => !prev);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-sm backdrop-blur-md transition-all hover:bg-white"
          aria-label={menuLabel}
          aria-expanded={open}
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {open ? (
          <div
            className={`absolute ${variant === "detail" ? "right-0 top-full mt-2 w-72 z-[70]" : "right-0 top-12 w-56"} overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
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
        message={`Record how many units of “${listing.name}” were sold. Current stock: ${currentAvailable}.`}
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
        message={`Add stock back to “${listing.name}”. Current stock: ${currentAvailable}.`}
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
