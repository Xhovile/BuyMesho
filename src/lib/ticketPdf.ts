import Logo from "../../photos/Logo.png";
import qrcode from "./qrcode-generator.js";


type PdfTicketLine = {
  label: string;
  value: string;
};

type TicketPdfOptions = {
  ticketCode: string;
  qrPayload: string;
  brandName?: string;
  brandTagline?: string;
};

type PdfColor = {
  r: number;
  g: number;
  b: number;
};

type EmbeddedImage = {
  rgbBytes: Uint8Array;
  alphaBytes: Uint8Array;
  width: number;
  height: number;
};

const BRAND_RED: PdfColor = { r: 175, g: 25, b: 42 };
const BRAND_CHARCOAL: PdfColor = { r: 24, g: 24, b: 27 };
const BRAND_MID: PdfColor = { r: 84, g: 84, b: 99 };
const BRAND_LIGHT: PdfColor = { r: 244, g: 244, b: 245 };
const BRAND_ZINC: PdfColor = { r: 63, g: 63, b: 70 };
const BRAND_MUTED: PdfColor = { r: 161, g: 161, b: 170 };

function encodeUtf8(input: string) {
  return new TextEncoder().encode(input);
}

function concatBytes(parts: Array<Uint8Array | string>) {
  const chunks = parts.map((part) => (typeof part === "string" ? encodeUtf8(part) : part));
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });

  return output;
}

function buildPdfObjectBytes(id: number, bodyParts: Array<Uint8Array | string>) {
  return concatBytes([`${id} 0 obj\n`, ...bodyParts, "\nendobj\n"]);
}

function rgb(color: PdfColor) {
  return `${(color.r / 255).toFixed(3)} ${(color.g / 255).toFixed(3)} ${(color.b / 255).toFixed(3)}`;
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mixColors(a: PdfColor, b: PdfColor, ratio: number): PdfColor {
  const clamped = Math.max(0, Math.min(1, ratio));
  return {
    r: clampByte(a.r * (1 - clamped) + b.r * clamped),
    g: clampByte(a.g * (1 - clamped) + b.g * clamped),
    b: clampByte(a.b * (1 - clamped) + b.b * clamped),
  };
}

function pdfSafeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/•/g, "|")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, "?");
}
function escapePdfText(value: string) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function addRect(commands: string[], x: number, y: number, width: number, height: number, color: PdfColor) {
  commands.push(`${rgb(color)} rg`);
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
}

function addText(commands: string[], x: number, y: number, size: number, text: string, color: PdfColor) {
  commands.push("BT");
  commands.push(`${rgb(color)} rg`);
  commands.push(`/F1 ${size} Tf`);
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
  commands.push(`(${escapePdfText(text)}) Tj`);
  commands.push("ET");
}

function estimateTextWidth(text: string, size: number) {
  return text.length * size * 0.52;
}

function wrapPdfText(text: string, size: number, maxWidth: number) {
  const value = text.trim();
  if (!value) return ["—"];

  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidth(candidate, size) <= maxWidth) {
      current = candidate;
      return;
    }

    if (current) pushCurrent();

    if (estimateTextWidth(word, size) <= maxWidth) {
      current = word;
      return;
    }

    let fragment = "";
    for (const character of word) {
      const next = `${fragment}${character}`;
      if (estimateTextWidth(next, size) <= maxWidth) {
        fragment = next;
        continue;
      }
      if (fragment) lines.push(fragment);
      fragment = character;
    }
    current = fragment;
  });

  pushCurrent();
  return lines.length ? lines : [value];
}

function addWrappedText(
  commands: string[],
  x: number,
  y: number,
  size: number,
  text: string,
  color: PdfColor,
  maxWidth: number,
  lineGap = size + 2,
) {
  const lines = wrapPdfText(text, size, maxWidth);
  lines.forEach((line, index) => addText(commands, x, y - index * lineGap, size, line, color));
  return y - lines.length * lineGap;
}

function addBrandWordmark(commands: string[], x: number, y: number, size: number, brandName: string) {
  if (brandName.trim().toLowerCase() === "buymesho") {
    addText(commands, x, y, size, "Buy", BRAND_RED);
    addText(commands, x + Math.round(size * 1.75), y, size, "Mesho", BRAND_ZINC);
    return;
  }

  addText(commands, x, y, size, brandName, BRAND_RED);
}

function addFieldBlock(
  commands: string[],
  x: number,
  y: number,
  label: string,
  value: string,
  width: number,
  options?: { labelSize?: number; valueSize?: number; valueColor?: PdfColor },
) {
  const labelSize = options?.labelSize ?? 8.2;
  const valueSize = options?.valueSize ?? 11.2;
  const valueColor = options?.valueColor ?? BRAND_CHARCOAL;

  addText(commands, x, y, labelSize, label.toUpperCase(), BRAND_MID);
  const valueTop = y - 14;
  const usedBottom = addWrappedText(commands, x, valueTop, valueSize, value, valueColor, width, valueSize + 1.8);
  return usedBottom - 9;
}

function drawTicketCodeMatrix(ticketCode: string, x: number, y: number, size: number) {
  const qr = qrcode(0, "H");
  qr.addData(ticketCode, "Byte");
  qr.make();

  const moduleCount = qr.getModuleCount();
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const moduleSize = size / totalModules;
  const commands: string[] = [];

  addRect(commands, x - 8, y - 8, size + 16, size + 16, BRAND_LIGHT);
  addRect(commands, x, y, size, size, { r: 255, g: 255, b: 255 });

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.isDark(row, col)) continue;
      commands.push(`${rgb(BRAND_CHARCOAL)} rg`);
      commands.push(`${(x + (col + quietZone) * moduleSize).toFixed(2)} ${(y + (moduleCount + quietZone - row - 1) * moduleSize).toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re f`);
    }
  }

  return commands;
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image asset: ${src}`));
    image.src = src;
  });
}

async function embedLogoAsImage(): Promise<EmbeddedImage> {
  const image = await loadImageElement(Logo);
  const canvas = document.createElement("canvas");
  const targetWidth = 112;
  const targetHeight = Math.max(1, Math.round((image.height / image.width) * targetWidth));

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare logo canvas.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const rgbBytes = new Uint8Array(canvas.width * canvas.height * 3);
  const alphaBytes = new Uint8Array(canvas.width * canvas.height);

  for (let index = 0, rgbIndex = 0; index < imageData.data.length; index += 4) {
    rgbBytes[rgbIndex] = imageData.data[index];
    rgbBytes[rgbIndex + 1] = imageData.data[index + 1];
    rgbBytes[rgbIndex + 2] = imageData.data[index + 2];
    alphaBytes[rgbIndex / 3] = imageData.data[index + 3];
    rgbIndex += 3;
  }

  return {
    rgbBytes,
    alphaBytes,
    width: canvas.width,
    height: canvas.height,
  };
}

function getLineValue(lines: PdfTicketLine[], label: string, fallback = "-") {
  const found = lines.find((line) => line.label.trim().toLowerCase() === label.trim().toLowerCase());
  return found?.value?.trim() || fallback;
}

async function createPdfBytes(title: string, lines: PdfTicketLine[], options: TicketPdfOptions) {
  const brandName = options.brandName?.trim() || "BuyMesho";
  const brandTagline = options.brandTagline?.trim() || "Official event ticket";
  const ticketCode = options.ticketCode.trim() || title.trim();
  const qrPayload = options.qrPayload.trim();
  if (!qrPayload.startsWith("BM1.")) {
    throw new Error("A signed BuyMesho ticket credential is required to generate the event ticket PDF.");
  }
  const logo = await embedLogoAsImage();
  const commands: string[] = [];

  // Printable A4 canvas with a single, credential-style ticket card.
  addRect(commands, 0, 0, 595, 842, { r: 248, g: 248, b: 249 });
  addRect(commands, 28, 30, 539, 782, { r: 255, g: 255, b: 255 });
  addRect(commands, 28, 758, 539, 54, BRAND_CHARCOAL);
  addRect(commands, 28, 750, 539, 8, BRAND_RED);

  const logoDisplayWidth = 38;
  const logoDisplayHeight = Math.max(18, Math.round((logo.height / logo.width) * logoDisplayWidth));
  const logoX = 45;
  const logoY = 771;
  commands.push("q");
  commands.push(`${logoDisplayWidth.toFixed(2)} 0 0 ${logoDisplayHeight.toFixed(2)} ${logoX.toFixed(2)} ${logoY.toFixed(2)} cm`);
  commands.push("/Im0 Do");
  commands.push("Q");

  addBrandWordmark(commands, 92, 783, 21, brandName);
  addText(commands, 92, 765, 9.5, brandTagline, BRAND_MUTED);

  addText(commands, 370, 784, 9, "VERIFIED EVENT TICKET", { r: 255, g: 255, b: 255 });
  addText(commands, 370, 766, 8, "DIGITALLY ISSUED", BRAND_MUTED);

  addText(commands, 50, 718, 26, title, BRAND_CHARCOAL);
  addText(commands, 50, 696, 10.5, "Event admission credential", BRAND_MID);

  addRect(commands, 50, 652, 495, 28, { r: 249, g: 246, b: 246 });
  addText(commands, 62, 664, 9.5, `Ticket ID: ${ticketCode}`, BRAND_CHARCOAL);
  addText(commands, 382, 664, 9.5, `STATUS: ${getLineValue(lines, "Status", "PAID").toUpperCase()}`, BRAND_RED);

  const field = (x: number, y: number, label: string, value: string, width: number, valueSize = 11.5) => {
    addText(commands, x, y, 7.5, label.toUpperCase(), BRAND_MID);
    addWrappedText(commands, x, y - 13, valueSize, value, BRAND_CHARCOAL, width, valueSize + 1.6);
  };

  field(50, 625, "Event", getLineValue(lines, "Event"), 225, 13);
  field(315, 625, "Organizer", getLineValue(lines, "Organizer", "Event Manager"), 230, 11.5);
  field(50, 575, "Date", getLineValue(lines, "Date"), 225);
  field(315, 575, "Time", getLineValue(lines, "Time"), 230);
  field(50, 525, "Venue", getLineValue(lines, "Venue"), 225);
  field(315, 525, "Ticket type", getLineValue(lines, "Ticket type", "General Admission"), 230);
  field(50, 475, "Holder", getLineValue(lines, "Holder", "Verified ticket holder"), 225);
  field(315, 475, "Amount", getLineValue(lines, "Amount"), 230);
  field(50, 425, "Payment reference", getLineValue(lines, "Reference"), 495, 10);

  // Separate the verification panel visually like a real admission credential.
  addRect(commands, 50, 136, 495, 248, { r: 248, g: 248, b: 249 });
  addRect(commands, 50, 370, 495, 14, BRAND_RED);
  addText(commands, 68, 346, 8.5, "AUTHENTICITY CHECK", BRAND_RED);
  addText(commands, 68, 326, 17, "Scan this code at the gate", BRAND_CHARCOAL);
  addWrappedText(commands, 68, 303, 10.5, "The QR code contains the BuyMesho-issued ticket credential. Ticket Validator checks the credential before admission.", BRAND_MID, 215, 14);

  const qrBoxX = 328;
  const qrBoxY = 160;
  const qrSize = 184;
  addRect(commands, qrBoxX, qrBoxY, 204, 204, { r: 255, g: 255, b: 255 });
  commands.push(...drawTicketCodeMatrix(qrPayload, qrBoxX + 10, qrBoxY + 10, qrSize));
  addText(commands, qrBoxX + 10, qrBoxY - 13, 8.5, "Ticket credential", BRAND_MID);
  addText(commands, qrBoxX + 10, qrBoxY - 28, 8.5, "Keep the QR fully visible when scanning.", BRAND_MUTED);

  addRect(commands, 68, 222, 220, 42, { r: 255, g: 255, b: 255 });
  addText(commands, 82, 246, 9, "BUYMESHO VERIFIED", BRAND_CHARCOAL);
  addText(commands, 82, 230, 8.5, "Authenticity is checked digitally.", BRAND_MID);

  addRect(commands, 50, 116, 495, 1.2, { r: 224, g: 224, b: 228 });
  addText(commands, 50, 94, 8.5, "This ticket grants admission only when its credential and ticket status are accepted by the event validator.", BRAND_MID);

  addRect(commands, 50, 70, 495, 1.2, mixColors(BRAND_RED, BRAND_CHARCOAL, 0.55));
  addBrandWordmark(commands, 50, 49, 9, brandName);
  addText(commands, 50, 36, 7.8, "Official event access | Keep this ticket available for entry verification.", BRAND_MUTED);
  const contentStream = commands.join("\n");
  const contentBytes = encodeUtf8(contentStream);

  const objects = [
    buildPdfObjectBytes(1, ["<< /Type /Catalog /Pages 2 0 R >>"]),
    buildPdfObjectBytes(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]),
    buildPdfObjectBytes(
      3,
      [
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> /XObject << /Im0 6 0 R /Im1 7 0 R >> >> /Contents 4 0 R >>",
      ],
    ),
    buildPdfObjectBytes(4, [`<< /Length ${contentBytes.length} >>\nstream\n`, contentBytes, "\nendstream"]),
    buildPdfObjectBytes(5, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]),
    buildPdfObjectBytes(
      6,
      [
        `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask 7 0 R /Length ${logo.rgbBytes.length} >>\nstream\n`,
        logo.rgbBytes,
        "\nendstream",
      ],
    ),
    buildPdfObjectBytes(
      7,
      [
        `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${logo.alphaBytes.length} >>\nstream\n`,
        logo.alphaBytes,
        "\nendstream",
      ],
    ),
  ];

  let output = encodeUtf8("%PDF-1.4\n");
  const offsets: number[] = [0];

  objects.forEach((object) => {
    offsets.push(output.length);
    output = concatBytes([output, object]);
  });

  const xrefOffset = output.length;
  let trailer = `xref\n0 ${objects.length + 1}\n`;
  trailer += `0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    trailer += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return concatBytes([output, trailer]);
}

export async function createTicketPdfBlob(title: string, lines: PdfTicketLine[], options: TicketPdfOptions) {
  return new Blob([await createPdfBytes(title, lines, options)], { type: "application/pdf" });
}

export function downloadTicketPdf(filename: string, title: string, lines: PdfTicketLine[], options: TicketPdfOptions) {
  void (async () => {
    try {
      const blob = await createTicketPdfBlob(title, lines, options);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      console.error("Failed to generate ticket PDF.", error);
    }
  })();
}
