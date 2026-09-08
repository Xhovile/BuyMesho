export const BUYMESHO_EMAIL = {
  appUrl: "https://buymesho.app",
  logoUrl: "https://buymesho.app/icon-192.png",
  brandRed: "#e00106",
  brandRedDark: "#991b1b",
  brandText: "#3f3f46",
  ink: "#111827",
  muted: "#6b7280",
  surface: "#f8fafc",
  border: "#e5e7eb",
} as const;

export type BuyMeshoEmailAction = {
  label: string;
  url: string;
};

export type BuyMeshoEmailOptions = {
  recipientName: string;
  title: string;
  intro?: string;
  bodyHtml?: string;
  bodyText?: string;
  action?: BuyMeshoEmailAction;
  preheader?: string;
  footerText?: string;
};

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderWordmark(): string {
  return `<span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1;font-weight:800;letter-spacing:-0.02em;"><span style="color:${BUYMESHO_EMAIL.brandRedDark};">Buy</span><span style="color:${BUYMESHO_EMAIL.brandText};">Mesho</span></span>`;
}

function renderTextWordmark(): string {
  return "BuyMesho";
}

export function renderBuyMeshoEmail(options: BuyMeshoEmailOptions) {
  const recipientNameText = options.recipientName;
  const recipientName = escapeEmailHtml(options.recipientName);
  const title = escapeEmailHtml(options.title);
  const intro = options.intro ? escapeEmailHtml(options.intro) : "";
  const actionUrl = options.action ? escapeEmailHtml(options.action.url) : "";
  const actionLabel = options.action ? escapeEmailHtml(options.action.label) : "";
  const preheader = escapeEmailHtml(options.preheader ?? options.title);
  const footerText = escapeEmailHtml(options.footerText ?? "If you did not expect this message, please contact BuyMesho Support.");

  const textSections = [
    renderTextWordmark(),
    "",
    recipientNameText ? `Hello ${recipientNameText},` : "Hello,",
    "",
    options.title,
    options.intro ?? "",
    options.bodyText ?? "",
    options.action ? `${options.action.label}: ${options.action.url}` : "",
    "",
    footerText.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, ""),
    "",
    renderTextWordmark(),
  ].filter(Boolean);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#ffffff;color:${BUYMESHO_EMAIL.ink};font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#ffffff;">
      <tr>
        <td align="center" style="padding:28px 14px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 18px;border-bottom:3px solid ${BUYMESHO_EMAIL.brandRed};">
                <a href="${BUYMESHO_EMAIL.appUrl}" style="text-decoration:none;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                    <tr>
                      <td valign="middle" style="padding:0 10px 0 0;">
                        <img src="${BUYMESHO_EMAIL.logoUrl}" width="44" height="44" alt="BuyMesho logo" style="display:block;width:44px;height:44px;border:0;border-radius:10px;" />
                      </td>
                      <td valign="middle">${renderWordmark()}</td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 0 0;">
                <h1 style="margin:0 0 16px;font-size:25px;line-height:1.25;font-weight:800;color:${BUYMESHO_EMAIL.ink};">${title}</h1>
                <p style="margin:0 0 12px;font-size:16px;color:${BUYMESHO_EMAIL.ink};">Hello ${recipientName || "there"},</p>
                ${intro ? `<p style="margin:0 0 22px;font-size:15px;color:#374151;">${intro}</p>` : ""}
                ${options.bodyHtml ?? ""}
                ${options.action ? `<p style="margin:24px 0 22px;"><a href="${actionUrl}" style="display:inline-block;background:${BUYMESHO_EMAIL.brandRed};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:800;">${actionLabel}</a></p>` : ""}
                <p style="margin:0;font-size:14px;color:${BUYMESHO_EMAIL.muted};">${footerText}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 0 0;border-top:1px solid ${BUYMESHO_EMAIL.border};margin-top:30px;">
                <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:${BUYMESHO_EMAIL.brandText};">BuyMesho</p>
                <p style="margin:0;font-size:12px;color:${BUYMESHO_EMAIL.muted};">Secure marketplace notifications</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    text: textSections.join("\n"),
    html,
  };
}

export function renderDetailCard(rows: Array<[label: string, value: string]>, heading = "Details"): string {
  const safeHeading = escapeEmailHtml(heading);
  const safeRows = rows
    .filter(([, value]) => value !== "")
    .map(([label, value]) => `<tr><td style="padding:10px 12px 10px 0;font-size:14px;color:${BUYMESHO_EMAIL.muted};width:42%;vertical-align:top;">${escapeEmailHtml(label)}</td><td style="padding:10px 0;font-size:14px;color:${BUYMESHO_EMAIL.ink};font-weight:700;vertical-align:top;word-break:break-word;">${escapeEmailHtml(value)}</td></tr>`)
    .join("");

  return `<div style="margin:0 0 22px;padding:18px;background:${BUYMESHO_EMAIL.surface};border:1px solid ${BUYMESHO_EMAIL.border};border-radius:12px;"><p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${BUYMESHO_EMAIL.brandRedDark};">${safeHeading}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">${safeRows}</table></div>`;
}

export function renderNoteCard(label: string, note: string): string {
  return `<div style="margin:0 0 22px;padding:16px 18px;background:#ffffff;border:1px solid ${BUYMESHO_EMAIL.border};border-left:4px solid ${BUYMESHO_EMAIL.brandRed};border-radius:10px;"><p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${BUYMESHO_EMAIL.brandRedDark};">${escapeEmailHtml(label)}</p><p style="margin:0;font-size:14px;line-height:1.7;color:${BUYMESHO_EMAIL.ink};white-space:pre-wrap;">${escapeEmailHtml(note)}</p></div>`;
}
