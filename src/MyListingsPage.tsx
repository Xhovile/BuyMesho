import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AccountPageShell from "./components/AccountPageShell";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import {
  SELLER_DASHBOARD_PATH,
  navigateToEditListing,
  navigateToListingDetails,
  navigateToPath,
  navigateToSellerProfile,
} from "./lib/appNavigation";
import type { Listing } from "./types";

function formatMWK(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
  return `MWK ${safeValue.toLocaleString()}`;
}

function promptForQuantity(message: string): number | null {
  const raw = window.prompt(message, "1");
  if (raw === null) return null;

  const quantity = Number(raw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    window.alert("Enter a valid quantity greater than zero.");
    return null;
  }

  return quantity;
}

type ListingRowProps = {
  listing: Listing;
  currentUid?: string;
  onEdit: (listing: Listing) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (listing: Listing) => void;
  onRecordSale: (listing: Listing, quantity: number) => void;
  onRestock: (listing: Listing, quantity: number) => void;
  onOpenDetails: (listing: Listing) => void;
  onOpenSeller: (sellerUid: string) => void;
};

function ListingRow({
  listing,
  currentUid,
  onEdit,
  onDelete,
  onToggleStatus,
  onRecordSale,
  onRestock,
  onOpenDetails,
  onOpenSeller,
}: ListingRowProps) {
  const sellerUid = typeof listing.seller_uid === "string" ? listing.seller_uid : "";
  const sellerName =
    typeof listing.business_name === "string" && listing.business_name.trim()
      ? listing.business_name.trim()
      : "Seller";
  const campusLabel =
    typeof listing.university === "string" && listing.university.trim()
      ? listing.university.trim()
      : "Unknown campus";
  const titleLabel =
    typeof listing.name === "string" && listing.name.trim()
      ? listing.name.trim()
      : "Untitled listing";

  const quantity = Number.isFinite(Number(listing.quantity)) ? Number(listing.quantity) : 1;
  const soldQuantity = Number.isFinite(Number(listing.sold_quantity))
    ? Number(listing.sold_quantity)
    : 0;
  const availableQuantity = Math.max(0, quantity - soldQuantity);
  const isSoldOut = availableQuantity <= 0;
  const firstPhoto =
    Array.isArray(listing.photos) && typeof listing.photos[0] === "string" && listing.photos[0].trim()
      ? listing.photos[0]
      : `https://picsum.photos/seed/${encodeURIComponent(String(listing.id ?? "listing"))}/400/400`;

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-[0_8px_24px_rgba(24,24,27,0.05)]">
      <div className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
        <button
          type="button"
          onClick={() => onOpenDetails(listing)}
          className="group relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40"
          aria-label={`Open ${titleLabel}`}
        >
          <img
            src={firstPhoto}
            alt={titleLabel}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
          />
        </button>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => sellerUid && onOpenSeller(sellerUid)}
              className="max-w-full truncate text-left text-sm font-extrabold text-red-900"
            >
              {sellerName}
            </button>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              {campusLabel}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                isSoldOut ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {isSoldOut ? "Sold out" : `${availableQuantity} left`}
            </span>
            {listing.is_verified ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                Verified
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 line-clamp-1 text-[18px] font-black tracking-tight text-zinc-900">
            {titleLabel}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
            <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-bold text-zinc-700">
              {formatMWK(Number(listing.price) || 0)}
            </span>
            <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-medium">
              Stock: {quantity}
            </span>
            <span className="rounded-lg bg-zinc-100 px-2.5 py-1 font-medium">
              Sold: {soldQuantity}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenDetails(listing)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => onEdit(listing)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(listing)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
          >
            {listing.status === "sold" ? "Mark available" : "Mark sold"}
          </button>
          <button
            type="button"
            onClick={() => {
              const quantityToSell = promptForQuantity(
                `How many units of “${titleLabel}” were sold? Current stock: ${availableQuantity}.`,
              );
              if (quantityToSell !== null) onRecordSale(listing, quantityToSell);
            }}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
          >
            Sale
          </button>
          <button
            type="button"
            onClick={() => {
              const quantityToAdd = promptForQuantity(
                `How many units do you want to restock for “${titleLabel}”? Current stock: ${availableQuantity}.`,
              );
              if (quantityToAdd !== null) onRestock(listing, quantityToAdd);
            }}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
          >
            Restock
          </button>
          <button
            type="button"
            onClick={() => onDelete(listing.id)}
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MyListingsPage() {
  const { firebaseUser, authLoading, profile, profileLoading } =
    useAccountProfile();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const loadListings = async () => {
      if (!firebaseUser || !profile?.is_seller) {
        setListings([]);
        setLoadingListings(false);
        return;
      }

      setLoadingListings(true);
      try {
        const data = await apiFetch(`/api/users/${firebaseUser.uid}/listings`);
        if (!Array.isArray(data)) {
          setListings([]);
          return;
        }

        const uniqueById = new Map<number, Listing>();
        for (const item of data) {
          if (
            !item ||
            typeof item !== "object" ||
            !Number.isFinite(Number((item as Listing).id))
          ) {
            continue;
          }
          const listing = item as Listing;
          uniqueById.set(Number(listing.id), listing);
        }

        setListings(Array.from(uniqueById.values()));
      } catch (error) {
        console.error("Failed to load my listings", error);
        setListings([]);
      } finally {
        setLoadingListings(false);
      }
    };

    void loadListings();
  }, [firebaseUser, profile?.is_seller]);

  const handleDeleteListing = async (listingId: number) => {
    if (actionLoadingId === listingId) return;

    setActionLoadingId(listingId);
    try {
      await apiFetch(`/api/listings/${listingId}`, { method: "DELETE" });
      setListings((prev) => prev.filter((item) => item.id !== listingId));
    } catch (error) {
      console.error("Failed to delete listing", error);
      window.alert("Failed to delete listing.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (listing: Listing) => {
    if (actionLoadingId === listing.id) return;

    const nextStatus = listing.status === "sold" ? "available" : "sold";
    setActionLoadingId(listing.id);
    try {
      await apiFetch(`/api/listings/${listing.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id ? { ...item, status: nextStatus } : item,
        ),
      );
    } catch (error) {
      console.error("Failed to toggle listing status", error);
      window.alert("Failed to update listing status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRecordSale = async (listing: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    if (actionLoadingId === listing.id) return;

    setActionLoadingId(listing.id);
    try {
      const result = await apiFetch(`/api/listings/${listing.id}/record-sale`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      });

      if (result?.listing) {
        setListings((prev) =>
          prev.map((item) =>
            item.id === result.listing.id ? { ...item, ...result.listing } : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to record sale", error);
      window.alert("Failed to record sale.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestock = async (listing: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    if (actionLoadingId === listing.id) return;

    setActionLoadingId(listing.id);
    try {
      const result = await apiFetch(`/api/listings/${listing.id}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      });

      if (result?.listing) {
        setListings((prev) =>
          prev.map((item) =>
            item.id === result.listing.id ? { ...item, ...result.listing } : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to restock listing", error);
      window.alert("Failed to restock listing.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AccountPageShell
      eyebrow="Seller"
      title="My Listings"
      description="Manage your listings, update stock, and open your seller dashboard from one place."
      backLabel="Back to Profile"
      onBack={() => navigateToPath("/profile")}
      childrenSectionClassName="w-full"
    >
      {authLoading || profileLoading || loadingListings ? (
        <div className="flex items-center justify-center gap-3 p-10 font-medium text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your listings...
        </div>
      ) : !firebaseUser ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">
            Login required
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            You need to log in before opening your listings page.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/login")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Go to Login
          </button>
        </div>
      ) : !profile?.is_seller ? (
        <div className="p-10 text-center">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">
            Seller access required
          </h2>
          <p className="mt-3 text-sm text-zinc-500">
            Only seller accounts can access My Listings.
          </p>
          <button
            type="button"
            onClick={() => navigateToPath("/become-seller")}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
          >
            Become a Seller
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="space-y-5 p-10 text-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">
              No listings yet
            </h2>
            <p className="mt-3 text-sm text-zinc-500">
              You have not posted any listings yet.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath(SELLER_DASHBOARD_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
            >
              Open Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigateToPath("/create")}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Create Listing
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Seller performance
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">
                  My Listings
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigateToPath(SELLER_DASHBOARD_PATH)}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95"
              >
                Open Dashboard
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {listings.map((listing) => (
              <div key={listing.id} className="min-w-0">
                <ListingRow
                  listing={listing}
                  currentUid={firebaseUser?.uid}
                  onEdit={(item) => navigateToEditListing(item.id)}
                  onDelete={(id) => void handleDeleteListing(id)}
                  onToggleStatus={(item) => void handleToggleStatus(item)}
                  onRecordSale={(item, quantity) => void handleRecordSale(item, quantity)}
                  onRestock={(item, quantity) => void handleRestock(item, quantity)}
                  onOpenDetails={(item) => navigateToListingDetails(item.id, 0)}
                  onOpenSeller={(sellerUid) => navigateToSellerProfile(sellerUid)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </AccountPageShell>
  );
}
