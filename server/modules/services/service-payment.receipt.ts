import type { ServicePaymentRecord } from "./service-payment.repository.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

function normalizePdfText(value: string): string {
  return value
    .normalize("NFKC")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replaceAll("\u2026", "...")
    .replaceAll("\u00a0", " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\uFFFF]/g, (char) => {
      const code = char.charCodeAt(0);
      return code <= 255 ? char : "?";
    });
}

function pdfString(value: string): string {
  const normalized = normalizePdfText(value);
  return `(${normalized.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")})`;
}

function wrapText(value: string, maxChars: number): string[] {
  const text = normalizePdfText(value).trim();
  if (!text) return [""];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word.slice(0, Math.max(1, maxChars));
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function money(value: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("en-MW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function pdfDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-MW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function rgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b].map((part) => part.toFixed(3)).join(" ");
}

function textCommand(
  value: string,
  x: number,
  y: number,
  size: number,
  options: { font?: string; color?: string } = {},
): string {
  const font = options.font ?? "F1";
  const color = rgb(options.color ?? "#111111");
  return [
    `BT`,
    `/${font} ${size} Tf`,
    `${color} rg`,
    `1 0 0 1 ${x} ${y} Tm`,
    `${pdfString(value)} Tj`,
    "ET",
  ].join("\n");
}

function lineCommand(x1: number, y1: number, x2: number, y2: number, color: string, width = 1): string {
  return [
    "q",
    `${rgb(color)} RG`,
    `${width} w`,
    `${x1} ${y1} m`,
    `${x2} ${y2} l`,
    "S",
    "Q",
  ].join("\n");
}

function rectCommand(
  x: number,
  y: number,
  width: number,
  height: number,
  options: { fill?: string; stroke?: string; lineWidth?: number; radius?: number } = {},
): string {
  const fill = options.fill ? `${rgb(options.fill)} rg` : "";
  const stroke = options.stroke ? `${rgb(options.stroke)} RG` : "";
  const lineWidth = options.lineWidth ?? 1;

  if (!options.radius) {
    const parts = ["q"];
    if (fill) parts.push(fill);
    if (stroke) parts.push(stroke, `${lineWidth} w`);
    parts.push(`${x} ${y} ${width} ${height} re`);
    parts.push(options.fill && options.stroke ? "B" : options.fill ? "f" : "S");
    parts.push("Q");
    return parts.join("\n");
  }

  const r = Math.min(options.radius, width / 2, height / 2);
  const k = 0.5522848;
  const c = r * k;
  const path = [
    `${x + r} ${y} m`,
    `${x + width - r} ${y} l`,
    `${x + width - c} ${y} ${x + width} ${y + r - c} ${x + width} ${y + r} c`,
    `${x + width} ${y + height - r} l`,
    `${x + width} ${y + height - r + c} ${x + width - r + c} ${y + height} ${x + width - r} ${y + height} c`,
    `${x + r} ${y + height} l`,
    `${x + r - c} ${y + height} ${x} ${y + height - r + c} ${x} ${y + height - r} c`,
    `${x} ${y + r} l`,
    `${x} ${y + r - c} ${x + r - c} ${y} ${x + r} ${y} c`,
    "h",
  ];

  const parts = ["q"];
  if (fill) parts.push(fill);
  if (stroke) parts.push(stroke, `${lineWidth} w`);
  parts.push(...path);
  parts.push(options.fill && options.stroke ? "B" : options.fill ? "f" : "S");
  parts.push("Q");
  return parts.join("\n");
}

export function buildXhovileStudioReceiptPdf(payment: ServicePaymentRecord): Buffer {
  const accent = payment.serviceType === "website_development" ? "#ff1d25" : "#168cff";
  const brand = "#8f1528";
  const ink = "#171717";
  const muted = "#646464";
  const light = "#f7f3ee";

  const commands: string[] = [];

  commands.push(rectCommand(0, 0, PAGE_WIDTH, PAGE_HEIGHT, { fill: "#f6f1ea" }));
  commands.push(rectCommand(0, PAGE_HEIGHT - 105, PAGE_WIDTH, 105, { fill: "#ffffff" }));
  commands.push(rectCommand(42, PAGE_HEIGHT - 91, 528, 4, { fill: accent }));
  commands.push(textCommand("XHOVILÉ STUDIO", 42, PAGE_HEIGHT - 58, 27, { font: "F2", color: brand }));
  commands.push(textCommand("PAYMENT RECEIPT", 42, PAGE_HEIGHT - 82, 10, { font: "F2", color: muted }));

  commands.push(rectCommand(456, PAGE_HEIGHT - 78, 114, 38, {
    fill: "#ffffff",
    stroke: brand,
    lineWidth: 1.2,
    radius: 10,
  }));
  commands.push(textCommand(payment.status.toUpperCase(), 474, PAGE_HEIGHT - 63, 10, {
    font: "F2",
    color: brand,
  }));

  commands.push(textCommand("Service", 42, 635, 9, { font: "F2", color: muted }));
  commands.push(textCommand(
    payment.serviceType === "graphic_design"
      ? "Graphic Design"
      : payment.serviceType === "website_development"
        ? "Website Development"
        : "Graphic Design + Web Development",
    42,
    614,
    16,
    { font: "F2", color: ink },
  ));

  commands.push(textCommand("Customer", 42, 578, 9, { font: "F2", color: muted }));
  commands.push(textCommand(payment.customerName, 42, 558, 14, { font: "F2", color: ink }));

  commands.push(lineCommand(42, 530, 570, 530, "#dddddd", 0.8));

  const rows = [
    ["Reference", payment.paymentReference ?? payment.id],
    ["Paid on", pdfDate(payment.paidAt ?? payment.updatedAt)],
  ];

  let y = 505;
  for (const [label, value] of rows) {
    commands.push(textCommand(label, 42, y, 9, { font: "F2", color: muted }));
    commands.push(textCommand(value, 160, y, 10, { color: ink }));
    y -= 28;
  }

  commands.push(textCommand("Project description", 42, 440, 9, { font: "F2", color: muted }));
  const descriptionLines = wrapText(payment.description, 83);
  let descriptionY = 419;
  for (const line of descriptionLines.slice(0, 4)) {
    commands.push(textCommand(line, 42, descriptionY, 10, { color: ink }));
    descriptionY -= 15;
  }

  const amountBoxY = Math.max(175, descriptionY - 22);
  commands.push(rectCommand(42, amountBoxY, 528, 92, {
    fill: light,
    stroke: "#ded7cf",
    lineWidth: 1,
    radius: 12,
  }));
  commands.push(textCommand("AMOUNT PAID", 60, amountBoxY + 62, 9, { font: "F2", color: muted }));
  commands.push(textCommand(money(payment.amount, payment.currency), 60, amountBoxY + 32, 25, {
    font: "F2",
    color: brand,
  }));

  commands.push(textCommand("Payment processing powered by BuyMesho and PayChangu.", 42, 87, 9, {
    color: muted,
  }));
  commands.push(lineCommand(42, 72, 570, 72, "#dedede", 0.8));
  commands.push(textCommand("Keep this receipt and your payment reference for your records.", 42, 52, 9, {
    color: muted,
  }));

  const stream = commands.join("\n") + "\n";

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Length " + Buffer.byteLength(stream, "latin1") + " >>\nstream\n" + stream + "endstream",
  ];

  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets[index + 1] = Buffer.byteLength(pdf, "latin1");
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
