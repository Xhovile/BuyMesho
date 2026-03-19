import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Listing, Category, University } from "../types";
import { CATEGORIES, UNIVERSITIES } from "../constants";
import FormDropdown from "./FormDropdown";

export default function EditListingModal({
  listing,
  onClose,
  onSave,
}: {
  listing: Listing;
  onClose: () => void;
  onSave: (updated: Partial<Listing>) => void;
}) {
  const [form, setForm] = useState({
    name: listing.name || "",
    price: String(listing.price ?? ""),
    description: listing.description || "",
    category: listing.category || "",
    university: listing.university || "",
    condition: listing.condition || "used",
    whatsapp_number: listing.whatsapp_number || "",
    quantity: String(listing.quantity ?? 1),
    sold_quantity: String(listing.sold_quantity ?? 0),
  });

  useEffect(() => {
    setForm({
      name: listing.name || "",
      price: String(listing.price ?? ""),
      description: listing.description || "",
      category: listing.category || "",
      university: listing.university || "",
      condition: listing.condition || "used",
      whatsapp_number: listing.whatsapp_number || "",
      quantity: String(listing.quantity ?? 1),
      sold_quantity: String(listing.sold_quantity ?? 0),
    });
  }, [listing]);

  const handleSave = () => {
    const priceNum = Number(form.price);
    const quantityNum = Number(form.quantity);
    const soldQuantityNum = Number(form.sold_quantity);

    if (Number.isNaN(priceNum)) {
      alert("Price must be a number.");
      return;
    }

    if (!Number.isInteger(quantityNum) || quantityNum < 1) {
      alert("Total quantity must be at least 1.");
      return;
    }

    if (!Number.isInteger(soldQuantityNum) || soldQuantityNum < 0) {
      alert("Sold quantity cannot be negative.");
      return;
    }

    if (soldQuantityNum > quantityNum) {
      alert("Sold quantity cannot be greater than total quantity.");
      return;
    }

    onSave({
      name: form.name,
      price: priceNum,
      description: form.description,
      category: form.category,
      university: form.university,
      whatsapp_number: form.whatsapp_number,
      condition: form.condition as "new" | "used" | "refurbished",
      quantity: quantityNum,
      sold_quantity: soldQuantityNum,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Edit Listing
            </h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Update your listing details
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-zinc-100"
            aria-label="Close edit listing modal"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Product name"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Price (MK)
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Price"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={form.whatsapp_number}
                onChange={(e) =>
                  setForm({ ...form, whatsapp_number: e.target.value })
                }
                placeholder="265..."
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Total Quantity
              </label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                Sold Quantity
              </label>
              <input
                type="number"
                min="0"
                value={form.sold_quantity}
                onChange={(e) => setForm({ ...form, sold_quantity: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormDropdown
              label="Category"
              value={form.category}
              options={CATEGORIES}
              searchPlaceholder="Search category..."
              onChange={(value) =>
                setForm({ ...form, category: value as Category })
              }
            />

            <FormDropdown
              label="University"
              value={form.university}
              options={UNIVERSITIES}
              searchPlaceholder="Search university..."
              onChange={(value) =>
                setForm({ ...form, university: value as University })
              }
            />
          </div>

           <FormDropdown
             label="Condition"
             value={form.condition}
             options={["new", "used", "refurbished"]}
             onChange={(value) =>
               setForm({
                 ...form,
                 condition: value as "new" | "used" | "refurbished",
               })
              }
            />


          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Describe your item"
              rows={4}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Note
            </p>
            <p className="text-sm text-zinc-600">
              Media cannot be edited here yet. Create a new listing if you want
              to change photos or video.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 bg-white flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 py-3 rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-xl font-bold transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
 }
