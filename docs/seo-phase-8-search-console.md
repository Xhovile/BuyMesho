# BuyMesho SEO Phase 8 — Search Console & Measurement

## 1. Search Console ownership

The repository supports Google Search Console HTML-tag verification through the build-time environment variable:

`VITE_GOOGLE_SITE_VERIFICATION`

Set this variable in the Vercel project, then redeploy. The Vite build adds:

`<meta name="google-site-verification" content="YOUR_TOKEN" />`

to the homepage HTML when the variable is present.

Do not commit the verification token to the repository.

Google documents the HTML-tag method as a supported URL-prefix verification method and notes that the tag must be present in the homepage `<head>`. citeturn534053search0

## 2. Verify the live HTML

After deployment, open the homepage and inspect the HTML source. Search for `google-site-verification`.

Also use Search Console's URL Inspection tool on:

- `https://buymesho.app/`
- `https://buymesho.app/explore`
- `https://buymesho.app/buy-online-malawi`
- `https://buymesho.app/sell-online-malawi`
- one live `/listing?listing=...` URL
- one live `/seller?uid=...` URL
- one live `/explore/events?event=...` URL

Search Console can show the rendered HTML Google sees, which is useful for checking metadata and structured data. citeturn534053search1

## 3. Submit the sitemap

Submit:

`https://buymesho.app/sitemap.xml`

The sitemap endpoint is dynamic and includes public marketplace content. After submission, monitor sitemap processing and indexing reports in Search Console.

Google recommends submitting a sitemap to keep Google informed about future URL changes. citeturn534053search6

## 4. Public SEO measurement

BuyMesho already initializes Firebase Analytics. Phase 8 adds a lightweight `screen_view` event for indexable public routes, using:

- `firebase_screen`: public pathname/canonical path
- `firebase_screen_class`: `BuyMeshoPublicPage`
- `page_type`: application route

Private/noindex routes are not included in this SEO page-view measurement.

Firebase documents `logEvent()` for web analytics and the `screen_view` event with `firebase_screen` and `firebase_screen_class` parameters. citeturn498811search0turn498811search4

## 5. What to monitor

Use Search Console for search visibility:

- indexed pages
- pages excluded from indexing
- impressions
- clicks
- average position
- sitemap status
- URL Inspection results
- structured-data issues

Use Firebase Analytics for public-site behavior:

- public page views
- top public landing pages
- marketplace/category discovery paths
- event and seller page traffic

These datasets answer different questions: Search Console measures Google Search visibility; Analytics measures visits and behavior after users reach the site.

## 6. First verification pass

Check a small representative set before scaling:

1. Homepage
2. Marketplace directory
3. Buyer-intent landing page
4. Seller-intent landing page
5. One category page
6. One product listing
7. One seller profile
8. One event detail page

For structured-data pages, Google recommends using the Rich Results Test and URL Inspection and correcting critical issues before wider rollout. citeturn534053search7
