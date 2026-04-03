import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { University } from "../types";
import { UNIVERSITIES } from "../constants";
import { apiFetch } from "../lib/api";

type Props = {
  initialName: string;
  initialUniversity: University;
  initialBio: string;
  onClose: () => void;
  onSuccess: (updatedProfile: any) => void;
};

export default function BecomeSellerModal({
  initialName,
  initialUniversity,
  initialBio,
  onClose,
  onSuccess,
}: Props) {
  const [businessName, setBusinessName] = useState(initialName || "");
  const [university, setUniversity] = useState<University>(initialUniversity);
  const [bio, setBio] = useState(initialBio || "");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim()) {
      alert("Display name is required.");
      return;
    }

    if (!whatsappNumber.trim()) {
      alert("WhatsApp number is required.");
      return;
    }

    setLoading(true);
    try {
      const updated = await apiFetch("/api/profile/become-seller", {
        method: "POST",
        body: JSON.stringify({
          business_name: businessName.trim(),
          university,
          bio: bio.trim(),
          whatsapp_number: whatsappNumber.trim(),
        }),
      });

      onSuccess(updated);
    } catch (err: any) {
      alert(err?.message || "Failed to become a seller.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900">Become a Seller</h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Unlock listing tools
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Seller Name
            </label>
            <input
              required
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Campus
            </label>
            <select
              value={university}
              onChange={(e) => setUniversity(e.target.value as University)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {UNIVERSITIES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              WhatsApp Number
            </label>
            <input
              required
              type="text"
              placeholder="265..."
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Seller Bio (Optional)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Become a Seller"}
          </button>
        </form>
      </div>
    </div>
  );
 }

