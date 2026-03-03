app.delete("/api/listings/:id", requireAuth, async (req, res) => {
  const uid = req.user!.uid;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid listing id" });
  }

  try {
    // Fetch listing including media fields
    const listing = db
      .prepare("SELECT id, seller_uid, photos, video_url FROM listings WHERE id = ?")
      .get(id) as { id: number; seller_uid: string; photos?: string | null; video_url?: string | null } | undefined;

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // 🔐 Ownership check (unchanged)
    if (listing.seller_uid !== uid) {
      return res.status(403).json({ error: "Forbidden: not your listing" });
    }

    // Collect media URLs (photos + video)
    const mediaUrls: string[] = [];
    try {
      const arr = JSON.parse(listing.photos || "[]");
      if (Array.isArray(arr)) mediaUrls.push(...arr.filter((x) => typeof x === "string"));
    } catch (e) {
      // If photos JSON is malformed, ignore and continue with whatever we have
      console.warn("Failed to parse photos JSON for listing", id, e);
    }

    if (listing.video_url && typeof listing.video_url === "string" && listing.video_url.trim().length > 0) {
      mediaUrls.push(listing.video_url);
    }

    // Convert to Cloudinary public_ids (unique)
    const publicIds = Array.from(
      new Set(
        mediaUrls
          .map((u) => (typeof u === "string" ? cloudinaryPublicIdFromUrl(u) : null))
          .filter((x): x is string => Boolean(x))
      )
    );

    // Best-effort delete each public id as both image and video
    const cloudinaryResults: any[] = [];
    for (const pid of publicIds) {
      // Try delete as image
      try {
        const rImg = await cloudinary.uploader.destroy(pid, { resource_type: "image" });
        cloudinaryResults.push({ public_id: pid, type: "image", result: rImg });
      } catch (e: any) {
        cloudinaryResults.push({ public_id: pid, type: "image", error: e?.message || String(e) });
      }

      // Try delete as video
      try {
        const rVid = await cloudinary.uploader.destroy(pid, { resource_type: "video" });
        cloudinaryResults.push({ public_id: pid, type: "video", result: rVid });
      } catch (e: any) {
        cloudinaryResults.push({ public_id: pid, type: "video", error: e?.message || String(e) });
      }
    }

    // Finally delete the listing row
    db.prepare("DELETE FROM listings WHERE id = ?").run(id);

    // Return success (include cloudinaryResults for debugging)
    return res.json({ success: true, cloudinaryResults });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Failed to delete listing" });
  }
});