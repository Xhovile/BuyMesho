import { createHmac, timingSafeEqual } from "node:crypto";
import qrcode from "../../../src/lib/qrcode-generator.js";
import { createTicketCredential } from "./ticketCredential.js";

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getDownloadSecret(): string {
  const secret =
    process.env.EVENT_TICKET_DOWNLOAD_SECRET?.trim() ||
    process.env.PAYCHANGU_WEBHOOK_SECRET?.trim() ||
    process.env.PAYCHANGU_SECRET_KEY?.trim();

  if (!secret) {
    throw new Error("Event ticket download signing secret is not configured.");
  }

  return secret;
}

function sign(ticketId: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${ticketId}.${expiresAt}`)
    .digest("base64url");
}

export function createEventTicketDownloadToken(
  ticketId: string,
  expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
): string {
  const normalizedTicketId = ticketId.trim();
  if (!normalizedTicketId) {
    throw new Error("Ticket ID is required to create a download token.");
  }

  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error("Ticket download token expiration must be in the future.");
  }

  return `${expiresAt}.${sign(normalizedTicketId, expiresAt, getDownloadSecret())}`;
}

export function verifyEventTicketDownloadToken(
  ticketId: string,
  token: string | undefined | null,
): boolean {
  const normalizedTicketId = ticketId.trim();
  const normalizedToken = String(token ?? "").trim();
  if (!normalizedTicketId || !normalizedToken) return false;

  const separator = normalizedToken.indexOf(".");
  if (separator <= 0 || separator === normalizedToken.length - 1) return false;

  const expiresAt = Number(normalizedToken.slice(0, separator));
  const signature = normalizedToken.slice(separator + 1);
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;

  try {
    const expected = sign(normalizedTicketId, expiresAt, getDownloadSecret());
    const expectedBytes = Buffer.from(expected);
    const actualBytes = Buffer.from(signature);
    return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
  } catch {
    return false;
  }
}

function pdfSafeText(value: string): string {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/•/g, "|")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string): string {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function addText(
  commands: string[],
  x: number,
  y: number,
  size: number,
  text: string,
  bold = false,
  color = "0 0 0",
) {
  commands.push("BT");
  commands.push("/" + (bold ? "F2" : "F1") + " " + size + " Tf");
  commands.push(color + " rg");
  commands.push("1 0 0 1 " + x.toFixed(2) + " " + y.toFixed(2) + " Tm");
  commands.push("(" + escapePdfText(text) + ") Tj");
  commands.push("ET");
}

function addLine(commands: string[], x1: number, y: number, x2: number) {
  commands.push("0.86 0.86 0.88 RG");
  commands.push("1 w");
  commands.push(x1.toFixed(2) + " " + y.toFixed(2) + " m " + x2.toFixed(2) + " " + y.toFixed(2) + " l S");
}

function wrapText(value: string, maxChars: number): string[] {
  const words = pdfSafeText(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["-"];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (candidate.length <= maxChars) { current = candidate; continue; }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : ["-"];
}
function addRect(commands: string[], x: number, y: number, width: number, height: number, red: number, green: number, blue: number) {
  commands.push((red / 255).toFixed(3) + " " + (green / 255).toFixed(3) + " " + (blue / 255).toFixed(3) + " rg");
  commands.push(x.toFixed(2) + " " + y.toFixed(2) + " " + width.toFixed(2) + " " + height.toFixed(2) + " re f");
}

function drawTicketCodeMatrix(commands: string[], payload: string, x: number, y: number, size: number) {
  const qr = qrcode(0, "H");
  qr.addData(payload, "Byte");
  qr.make();
  const moduleCount = qr.getModuleCount();
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const moduleSize = size / totalModules;
  addRect(commands, x - 8, y - 8, size + 16, size + 16, 244, 244, 245);
  addRect(commands, x, y, size, size, 255, 255, 255);
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.isDark(row, col)) continue;
      commands.push("0.071 0.071 0.078 rg");
      commands.push((x + (col + quietZone) * moduleSize).toFixed(2) + " " + (y + (moduleCount + quietZone - row - 1) * moduleSize).toFixed(2) + " " + moduleSize.toFixed(2) + " " + moduleSize.toFixed(2) + " re f");
    }
  }
}
type TicketPdfData = {
  eventTitle: string;
  organizer: string;
  ticketId: string;
  ticketType: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  eventDate: string;
  startTime: string;
  venue: string;
  location: string;
  status: string;
  amount: string;
  orderId: string;
  qrPayload: string;
};

export function createEventTicketPdf(data: TicketPdfData): Buffer {
  if (!data.qrPayload.startsWith("BM1.")) {
    throw new Error("A signed BuyMesho ticket credential is required to generate the event ticket PDF.");
  }

  const commands: string[] = [];
  commands.push("0.97 0.97 0.98 rg");
  commands.push("0 0 595 842 re f");
  commands.push("0.09 0.09 0.11 rg");
  commands.push("0 760 595 82 re f");
  commands.push("0.69 0.10 0.16 rg");
  commands.push("0 748 595 12 re f");

  addText(commands, 34, 795, 22, "BuyMesho", true, "1 1 1");
  addText(commands, 34, 774, 9, "OFFICIAL EVENT TICKET", false, "1 1 1");
  addText(commands, 395, 795, 9, "VERIFIED EVENT ACCESS", true, "1 1 1");
  addText(commands, 395, 777, 8, "DIGITALLY ISSUED", false, "0.75 0.75 0.78");

  addText(commands, 34, 710, 27, data.eventTitle, true);
  addText(commands, 34, 689, 11, "Event admission credential");

  addRect(commands, 34, 646, 527, 34, 249, 246, 246);
  addText(commands, 48, 659, 9, "Ticket ID: " + data.ticketId, true);
  addText(commands, 402, 659, 9, ("STATUS: " + (data.status || "Paid")).toUpperCase());

  const field = (x: number, y: number, label: string, value: string, width = 240, valueSize = 11.5) => {
    addText(commands, x, y, 7.5, label.toUpperCase());
    const lines = wrapText(value || "-", Math.max(22, Math.floor(width / 6.2)));
    let nextY = y - 14;
    for (const line of lines.slice(0, 3)) {
      addText(commands, x, nextY, valueSize, line, true);
      nextY -= valueSize + 2;
    }
  };

  field(34, 620, "Event", data.eventTitle, 240, 12);
  field(310, 620, "Organizer", data.organizer, 250, 11.5);
  field(34, 570, "Date", data.eventDate, 240);
  field(310, 570, "Time", data.startTime, 250);
  field(34, 520, "Venue", [data.venue, data.location].filter(Boolean).join(" | "), 240);
  field(310, 520, "Ticket type", data.ticketType, 250);
  field(34, 470, "Holder", data.holderName, 240);
  field(310, 470, "Amount", data.amount, 250);
  field(34, 420, "Reference", data.orderId, 527, 10.5);

  addRect(commands, 34, 130, 527, 248, 248, 248, 249);
  addRect(commands, 34, 364, 527, 14, 175, 25, 42);
  addText(commands, 52, 340, 8.5, "AUTHENTICITY CHECK");
  addText(commands, 52, 318, 18, "Scan this code at the gate", true);
  addText(commands, 52, 294, 10, "Ticket Validator verifies this BuyMesho-issued credential before admission.");
  addText(commands, 52, 270, 10, "Credential: BM1 | Issuer: BuyMesho");

  const qrBoxX = 325;
  const qrBoxY = 155;
  addRect(commands, qrBoxX, qrBoxY, 204, 204, 255, 255, 255);
  drawTicketCodeMatrix(commands, data.qrPayload, qrBoxX + 10, qrBoxY + 10, 184);
  addText(commands, 52, 226, 8.5, "BUYMESHO VERIFIED", true);
  addText(commands, 52, 210, 8.5, "Authenticity is checked digitally.");

  addLine(commands, 34, 110, 561);
  addText(commands, 34, 88, 8.5, "This ticket grants admission only when its credential and ticket status are accepted.");
  addText(commands, 34, 58, 8.5, "Keep the QR fully visible when scanning.");
  addText(commands, 34, 36, 7.8, "BuyMesho | Official event access");

  const content = Buffer.from(commands.join("\n"), "ascii");
  const objects: Buffer[] = [];
  const object = (id: number, value: Buffer | string) => Buffer.concat([
    Buffer.from(id + " 0 obj\n", "ascii"),
    Buffer.isBuffer(value) ? value : Buffer.from(value, "ascii"),
    Buffer.from("\nendobj\n", "ascii"),
  ]);
  objects.push(object(1, "<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  objects.push(object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>"));
  objects.push(object(4, Buffer.concat([
    Buffer.from("<< /Length " + content.length + " >>\nstream\n", "ascii"),
    content,
    Buffer.from("\nendstream", "ascii"),
  ])));
  objects.push(object(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  objects.push(object(6, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));

  let output = Buffer.from("%PDF-1.4\n", "ascii");
  const offsets = [0];
  for (const item of objects) {
    offsets.push(output.length);
    output = Buffer.concat([output, item]);
  }
  const xrefOffset = output.length;
  let xref = "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    xref += String(offsets[index]).padStart(10, "0") + " 00000 n \n";
  }
  xref += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
  return Buffer.concat([output, Buffer.from(xref, "ascii")]);
}
export function createEventTicketDownloadResponse(
  ticketRow: Record<string, unknown>,
  res: {
    setHeader(name: string, value: string): unknown;
    status(code: number): { json(value: unknown): unknown; send(value: Buffer): unknown };
  },
) {
  const status = String(ticketRow.status ?? "").trim();
  if (["cancelled", "refunded"].includes(status.toLowerCase())) {
    return res.status(410).json({ error: "This ticket is no longer valid." });
  }

  const ticketId = String(ticketRow.code ?? ticketRow.id ?? "").trim();
  if (!ticketId) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  const eventId = String(ticketRow.event_id ?? "").trim();
  const orderId = String(ticketRow.order_id ?? "").trim();
  const purchaseDate = String(ticketRow.purchase_date ?? "").trim();
  if (!eventId || !orderId) throw new Error("Ticket credential source data is incomplete.");
  const issuedAt = purchaseDate ? Math.floor(Date.parse(purchaseDate) / 1000) : undefined;
  const qrPayload = createTicketCredential({ ticketId, eventId, orderId, issuedAt: Number.isFinite(issuedAt) ? issuedAt : undefined });
  const title = String(ticketRow.event_title ?? "Event ticket").trim() || "Event ticket";
  const pdf = createEventTicketPdf({
    eventTitle: title,
    organizer: String(ticketRow.organizer_name ?? "Event organizer"),
    ticketId,
    ticketType: String(ticketRow.ticket_type ?? "General Admission"),
    holderName: String(ticketRow.holder_name ?? ""),
    holderEmail: String(ticketRow.holder_email ?? ""),
    holderPhone: String(ticketRow.holder_phone ?? ""),
    eventDate: String(ticketRow.event_date ?? ""),
    startTime: String(ticketRow.start_time ?? ""),
    venue: String(ticketRow.venue ?? ""),
    location: String(ticketRow.location ?? ""),
    status: status || "Paid",
    amount: String(ticketRow.amount ?? ""),
    orderId,
    qrPayload,
  });

  const filename = sanitizeFilename(`${title}-${ticketId}`) + ".pdf";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", String(pdf.length));
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).send(pdf);
}
