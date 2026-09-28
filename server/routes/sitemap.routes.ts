import type { Express, Response } from "express";

const SITE_URL = "https://buymesho.app";
const SITEMAP_CACHE_TTL_MS = 5 * 60 * 1000;
const SITEMAP_CHUNK_SIZE = 20000;

type SitemapUrl = {
  loc: string;
  lastmod?: string | null;
};

type SitemapRow = {
  id: number | string;
  updated_at?: string | null;
};

type SitemapCache = {
  expiresAt: number;
  urls: SitemapUrl[];
  publicPages: SitemapUrl[];
};

let sitemapCache: SitemapCache | null = null;

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return character;
    }
  });
}

function normalizeLastmod(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function buildUrlEntry({ loc, lastmod }: SitemapUrl) {
  const lastmodValue = normalizeLastmod(lastmod);
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmodValue ? `    <lastmod>${lastmodValue}</lastmod>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildUrlsetXml(urls: SitemapUrl[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.map(buildUrlEntry).join("\n"),
    "</urlset>",
  ].join("\n");
}

export function buildSitemapIndexXml(sitemapUrls: string[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemapUrls
      .map(
        (loc) =>
          [
            "  <sitemap>",
            `    <loc>${escapeXml(loc)}</loc>`,
            "  </sitemap>",
          ].join("\n")
      )
      .join("\n"),
    "</sitemapindex>",
  ].join("\n");
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function loadSitemapData(db: any) {
  const now = Date.now();
  if (sitemapCache && sitemapCache.expiresAt > now) {
    return sitemapCache;
  }

  const publicPages: SitemapUrl[] = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/install` },
    { loc: `${SITE_URL}/signup` },
    { loc: `${SITE_URL}/about` },
    { loc: `${SITE_URL}/explore` },
    { loc: `${SITE_URL}/buy-online-malawi` },
    { loc: `${SITE_URL}/sell-online-malawi` },
    { loc: `${SITE_URL}/explore/deals` },
    { loc: `${SITE_URL}/explore/events` },
    { loc: `${SITE_URL}/explore/wholesale` },
    { loc: `${SITE_URL}/explore/sellers` },
    { loc: `${SITE_URL}/category?category=phones` },
    { loc: `${SITE_URL}/category?category=fashion` },
    { loc: `${SITE_URL}/category?category=books` },
    { loc: `${SITE_URL}/category?category=food` },
    { loc: `${SITE_URL}/category?category=beauty` },
    { loc: `${SITE_URL}/privacy` },
    { loc: `${SITE_URL}/terms` },
    { loc: `${SITE_URL}/safety` },
  ];

  const listingRows = db
    .prepare(
      `
        SELECT l.id, l.updated_at
        FROM listings l
        JOIN sellers s ON l.seller_uid = s.uid
        WHERE l.is_hidden = 0
          AND l.deleted_at IS NULL
          AND s.is_seller = 1
        ORDER BY l.updated_at DESC, l.id DESC
      `
    )
    .all() as SitemapRow[];

  const sellerRows = db
    .prepare(
      `
        SELECT uid AS id, updated_at
        FROM sellers
        WHERE is_seller = 1
        ORDER BY updated_at DESC, uid ASC
      `
    )
    .all() as SitemapRow[];

  const eventRows = db
    .prepare(
      `
        SELECT id, updated_at
        FROM events
        WHERE deleted_at IS NULL
          AND publication_status = 'published'
          AND (
            publication_mode = 'immediate'
            OR (
              publication_mode = 'scheduled'
              AND publication_at IS NOT NULL
              AND publication_at <= CURRENT_TIMESTAMP
            )
          )
        ORDER BY updated_at DESC, id DESC
      `
    )
    .all() as SitemapRow[];

  const dynamicUrls: SitemapUrl[] = [
    ...listingRows.map((row) => ({
      loc: `${SITE_URL}/listing?listing=${encodeURIComponent(String(row.id))}`,
      lastmod: row.updated_at,
    })),
    ...sellerRows.map((row) => ({
      loc: `${SITE_URL}/seller?uid=${encodeURIComponent(String(row.id))}`,
      lastmod: row.updated_at,
    })),
    ...eventRows.map((row) => ({
      loc: `${SITE_URL}/explore/events?event=${encodeURIComponent(String(row.id))}`,
      lastmod: row.updated_at,
    })),
  ];

  sitemapCache = {
    expiresAt: now + SITEMAP_CACHE_TTL_MS,
    urls: dynamicUrls,
    publicPages,
  };

  return sitemapCache;
}

export function registerSitemapRoutes(app: Express, { db }: { db: any }) {
  const sendXml = (res: Response, xml: string, status = 200) => {
    res
      .status(status)
      .set({
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      })
      .send(xml);
  };

  const getData = () => loadSitemapData(db);

  app.get("/api/seo/sitemap.xml", (_req, res) => {
    try {
      const data = getData();
      const allUrls = [...data.publicPages, ...data.urls];
      const chunks = chunk(allUrls, SITEMAP_CHUNK_SIZE);

      if (chunks.length > 1) {
        const childUrls = chunks.map(
          (_chunk, index) => `${SITE_URL}/sitemap-${index + 1}.xml`
        );
        sendXml(res, buildSitemapIndexXml(childUrls));
        return;
      }

      sendXml(res, buildUrlsetXml(allUrls));
    } catch (error) {
      console.error("Failed to build sitemap", error);
      res.status(500).type("text/plain").send("Sitemap generation failed");
    }
  });

  app.get("/api/seo/sitemap-:chunk.xml", (req, res) => {
    try {
      const data = getData();
      const allUrls = [...data.publicPages, ...data.urls];
      const chunks = chunk(allUrls, SITEMAP_CHUNK_SIZE);
      const chunkNumber = Number(req.params.chunk);
      const index = Number.isInteger(chunkNumber) ? chunkNumber - 1 : -1;

      if (index < 0 || index >= chunks.length) {
        res.status(404).type("text/plain").send("Sitemap chunk not found");
        return;
      }

      sendXml(res, buildUrlsetXml(chunks[index]));
    } catch (error) {
      console.error("Failed to build sitemap chunk", error);
      res.status(500).type("text/plain").send("Sitemap generation failed");
    }
  });
}
