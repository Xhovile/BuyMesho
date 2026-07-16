  app.get("/api/users/:uid/rating-summary", attachOptionalAuth, (req, res) => {
  const { uid } = req.params;
  const rater_uid = req.user?.uid ?? null;

  try {
    const seller = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(uid) as { uid: string } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    const summary = db
      .prepare(`
        SELECT 
          COUNT(*) as ratingCount,
          ROUND(AVG(stars), 1) as averageRating
        FROM seller_ratings
        WHERE seller_uid = ?
      `)
      .get(uid) as { ratingCount: number | string; averageRating: number | string | null } | undefined;

    const mine = rater_uid
      ? (db
          .prepare(`
            SELECT stars
            FROM seller_ratings
            WHERE seller_uid = ? AND rater_uid = ?
          `)
          .get(uid, rater_uid) as { stars: number } | undefined)
      : undefined;

    const rows = db
      .prepare(
        `
          SELECT stars, COUNT(*) as count
          FROM seller_ratings
          WHERE seller_uid = ?
          GROUP BY stars
        `
      )
      .all(uid) as Array<{ stars: number; count: number | string }>;

    const ratingCount = Number(summary?.ratingCount ?? 0);
    const averageRating = ratingCount > 0 ? Number(Number(summary?.averageRating ?? 0).toFixed(1)) : 0;

    const distribution = [5, 4, 3, 2, 1].map((star) => {
      const match = rows.find((row) => Number(row.stars) === star);
      const count = Number(match?.count ?? 0);
      const percentage = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;
      return { stars: star, count, percentage };
    });

    return res.json({
      averageRating,
      ratingCount,
      myRating: mine?.stars ?? null,
      distribution,
    });
  } catch (e: any) {
    console.error("GET /api/users/:uid/rating-summary error:", e);
    return res.status(500).json({ error: "Failed to load rating summary" });
  }
});

app.post("/api/users/:uid/rating", requireAuth, (req, res) => {
  const seller_uid = req.params.uid;
  const rater_uid = req.user!.uid;
  const { stars } = req.body;

  const safeStars = Number(stars);

  if (!Number.isInteger(safeStars) || safeStars < 1 || safeStars > 5) {
    return res.status(400).json({ error: "stars must be an integer from 1 to 5" });
  }

  if (seller_uid === rater_uid) {
    return res.status(400).json({ error: "You cannot rate yourself" });
  }

  try {
    const seller = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(seller_uid) as { uid: string } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    db.prepare(`
      INSERT INTO seller_ratings (seller_uid, rater_uid, stars)
      VALUES (?, ?, ?)
      ON CONFLICT(seller_uid, rater_uid)
      DO UPDATE SET
        stars = excluded.stars,
        updated_at = CURRENT_TIMESTAMP
    `).run(seller_uid, rater_uid, safeStars);

    const summary = db
      .prepare(`
        SELECT 
          COUNT(*) as ratingCount,
          ROUND(AVG(stars), 1) as averageRating
        FROM seller_ratings
        WHERE seller_uid = ?
      `)
      .get(seller_uid) as { ratingCount: number | string; averageRating: number | string | null } | undefined;

    return res.json({
      success: true,
      averageRating: Number(summary?.averageRating ?? 0),
      ratingCount: Number(summary?.ratingCount ?? 0),
      myRating: safeStars,
    });
  } catch (e: any) {
    console.error("POST /api/users/:uid/rating error:", e);
    return res.status(500).json({ error: "Failed to save rating" });
  }
});

app.delete("/api/users/:uid/rating", requireAuth, (req, res) => {
  const seller_uid = req.params.uid;
  const rater_uid = req.user!.uid;

  try {
    const seller = db
      .prepare("SELECT uid FROM sellers WHERE uid = ?")
      .get(seller_uid) as { uid: string } | undefined;

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    db.prepare(`
      DELETE FROM seller_ratings
      WHERE seller_uid = ? AND rater_uid = ?
    `).run(seller_uid, rater_uid);

    const summary = db
      .prepare(`
        SELECT 
          COUNT(*) as ratingCount,
          ROUND(AVG(stars), 1) as averageRating
        FROM seller_ratings
        WHERE seller_uid = ?
      `)
      .get(seller_uid) as { ratingCount: number | string; averageRating: number | string | null } | undefined;

    return res.json({
      success: true,
      averageRating: Number(summary?.averageRating ?? 0),
      ratingCount: Number(summary?.ratingCount ?? 0),
      myRating: null,
    });
  } catch (e: any) {
    console.error("DELETE /api/users/:uid/rating error:", e);
    return res.status(500).json({ error: "Failed to remove rating" });
  }
});