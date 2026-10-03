import { createHmac, timingSafeEqual } from "node:crypto";

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

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function sanitizeFilename(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "buymesho-ticket";
}

function addText(commands: string[], x: number, y: number, size: number, text: string, bold = false) {
  commands.push("BT");
  commands.push(`/${bold ? "F2" : "F1"} ${size} Tf`);
  commands.push(`0 0 0 rg`);
  commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
  commands.push(`(${escapePdfText(text)}) Tj`);
  commands.push("ET");
}

function addLine(commands: string[], x1: number, y: number, x2: number) {
  commands.push("0.86 0.86 0.88 RG");
  commands.push("1 w");
  commands.push(`${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S`);
}

function wrapText(value: string, maxChars: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["—"];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : ["—"];
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addRect(commands: string[], x: number, y: number, width: number, height: number, red: number, green: number, blue: number) {
  commands.push(`${(red / 255).toFixed(3)} ${(green / 255).toFixed(3)} ${(blue / 255).toFixed(3)} rg`);
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
}

function drawTicketCodeMatrix(ticketCode: string, x: number, y: number, size: number) {
  const moduleCount = 29;
  const moduleSize = size / moduleCount;
  const matrix: Array<Array<boolean | null>> = Array.from(
    { length: moduleCount },
    () => Array<boolean | null>(moduleCount).fill(null),
  );

  const reserveFinder = (startX: number, startY: number) => {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const edge = row === 0 || row === 6 || col === 0 || col === 6;
        const center = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        matrix[startY + row][startX + col] = edge || center;
      }
    }
  };

  reserveFinder(0, 0);
  reserveFinder(moduleCount - 7, 0);
  reserveFinder(0, moduleCount - 7);

  for (let index = 0; index < moduleCount; index += 1) {
    matrix[6][index] = index % 2 === 0;
    matrix[index][6] = index % 2 === 0;
  }

  matrix[moduleCount - 8][8] = true;

  const payloadBits = Array.from(ticketCode)
    .map((character) => character.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
  const rng = createRng(hashString(ticketCode));
  let bitCursor = 0;

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (matrix[row][col] !== null) continue;
      const payloadBit = payloadBits.length ? payloadBits[bitCursor % payloadBits.length] : "0";
      const randomBit = rng() > 0.5 ? "1" : "0";
      matrix[row][col] = (Number(payloadBit) ^ Number(randomBit)) === 1;
      bitCursor += 1;
    }
  }

  addRect(commands, x - 6, y - 6, size + 12, size + 12, 244, 244, 245);
  addRect(commands, x, y, size, size, 255, 255, 255);

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!matrix[row][col]) continue;
      commands.push("0.071 0.071 0.078 rg");
      commands.push(
        `${(x + col * moduleSize).toFixed(2)} ${(y + (moduleCount - 1 - row) * moduleSize).toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re f`,
      );
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
};

export function createEventTicketPdf(data: TicketPdfData): Buffer {
  const commands: string[] = [];

  commands.push("0.97 0.97 0.98 rg");
  commands.push("0 0 595 842 re f");
  commands.push("0.86 0.00 0.03 rg");
  commands.push("0 810 595 32 re f");
  commands.push("1 1 1 rg");
  commands.push("0 770 595 40 re f");

  addText(commands, 34, 787, 22, "BuyMesho", true);
  addText(commands, 34, 742, 26, "Event Ticket", true);
  addText(commands, 34, 718, 11, "Official event ticket");
  addLine(commands, 34, 698, 561);

  const left = 34;
  const right = 310;
  let leftY = 668;
  let rightY = 668;

  const field = (x: number, y: number, label: string, value: string, width = 235) => {
    addText(commands, x, y, 9, label.toUpperCase(), false);
    const lines = wrapText(value || "—", Math.max(22, Math.floor(width / 6.2)));
    let nextY = y - 16;
    for (const line of lines.slice(0, 3)) {
      addText(commands, x, nextY, 12, line, true);
      nextY -= 15;
    }
    return nextY - 13;
  };

  leftY = field(left, leftY, "Event", data.eventTitle);
  leftY = field(left, leftY, "Organizer", data.organizer);
  leftY = field(left, leftY, "Ticket type", data.ticketType);
  leftY = field(left, leftY, "Date", data.eventDate || "—");
  leftY = field(left, leftY, "Time", data.startTime || "—");

  rightY = field(right, rightY, "Ticket ID", data.ticketId, 230);
  rightY = field(right, rightY, "Holder", data.holderName || "—");
  rightY = field(right, rightY, "Email", data.holderEmail || "—");
  rightY = field(right, rightY, "Phone", data.holderPhone || "—");
  rightY = field(right, rightY, "Venue", [data.venue, data.location].filter(Boolean).join(" • ") || "—");
  rightY = field(right, rightY, "Amount", data.amount || "—");

  const boxY = Math.min(leftY, rightY) - 4;
  commands.push("1 1 1 rg");
  commands.push(`34 ${boxY.toFixed(2)} 527 84 re f`);
  commands.push("0.86 0.86 0.88 RG");
  commands.push(`34 ${boxY.toFixed(2)} 527 84 re S`);
  addText(commands, 50, boxY + 58, 9, "ENTRY STATUS", false);
  addText(commands, 50, boxY + 35, 18, data.status || "Paid", true);
  addText(commands, 310, boxY + 58, 9, "TICKET CODE", false);
  addText(commands, 310, boxY + 35, 14, data.ticketId, true);

  const codeBoxX = 355;
  const codeBoxY = 92;
  addRect(commands, codeBoxX, codeBoxY, 206, 280, 255, 255, 255);
  addText(commands, codeBoxX + 18, codeBoxY + 254, 9, "TICKET CODE", false);
  addText(commands, codeBoxX + 18, codeBoxY + 232, 14, data.ticketId, true);
  drawTicketCodeMatrix(data.ticketId, codeBoxX + 27, codeBoxY + 38, 150);
  addText(commands, codeBoxX + 18, codeBoxY + 22, 9, "Use this code for event validation.", false);

  addText(commands, 34, 70, 10, "Present this ticket or ticket code to the event validation team.", false);
  addText(commands, 34, 50, 9, "BuyMesho • Secure event ticket", false);

  const content = Buffer.from(commands.join("\n"), "latin1");
  const objects: Buffer[] = [];
  const object = (id: number, value: Buffer | string) =>
    Buffer.concat([
      Buffer.from(`${id} 0 obj\n`, "ascii"),
      Buffer.isBuffer(value) ? value : Buffer.from(value, "ascii"),
      Buffer.from("\nendobj\n", "ascii"),
    ]);

  objects.push(object(1, "<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  objects.push(object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>"));
  objects.push(object(4, Buffer.concat([
    Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "ascii"),
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
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

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
  });

  const filename = sanitizeFilename(`${title}-${ticketId}`) + ".pdf";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", String(pdf.length));
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).send(pdf);
}
