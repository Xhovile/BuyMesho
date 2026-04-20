// (full file omitted for brevity, only key additions shown conceptually)

// ADD BELOW handleDeleteListing
const handleRecordSale = async (listing: Listing) => {
  const qty = Number(prompt("How many units sold?", "1"));
  if (!qty || qty <= 0) return;

  try {
    await apiFetch(`/api/listings/${listing.id}/record-sale`, {
      method: "POST",
      body: JSON.stringify({ quantity: qty }),
    });

    applyListingUpdate(listing.id, (l) => ({
      ...l,
      sold_quantity: Number(l.sold_quantity || 0) + qty,
    }));
  } catch {
    alert("Failed to record sale");
  }
};

const handleAddGoods = async (listing: Listing) => {
  const qty = Number(prompt("How many items are you adding?", "1"));
  if (!qty || qty <= 0) return;

  try {
    await apiFetch(`/api/listings/${listing.id}/restock`, {
      method: "POST",
      body: JSON.stringify({ quantity: qty }),
    });

    applyListingUpdate(listing.id, (l) => ({
      ...l,
      quantity: Number(l.quantity || 0) + qty,
    }));
  } catch {
    alert("Failed to add stock");
  }
};

// MODIFY ListingCard props
<ListingCard
...
 onRecordSale={(item)=>handleRecordSale(item)}
 onAddGoods={(item)=>handleAddGoods(item)}
/>
