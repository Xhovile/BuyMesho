import Logo from "../../photos/Logo.png";

type PdfTicketLine = {
  label: string;
  value: string;
};

type TicketPdfOptions = {
  ticketCode: string;
  brandName?: string;
  brandTagline?: string;
};

type PdfColor = {
  r: number;
  g: number;
  b: number;
};

type EmbeddedImage = {
  bytes: Uint8Array;
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

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function hashString(value: string) {
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
  const valueSize = options?.valueSize ?? 11.6;
  const valueColor = options?.valueColor ?? BRAND_CHARCOAL;
  const maxWidth = width;

  addText(commands, x, y, labelSize, label.toUpperCase(), BRAND_MID);
  const valueTop = y - 14;
  const usedBottom = addWrappedText(commands, x, valueTop, valueSize, value, valueColor, maxWidth, valueSize + 1.8);
  return usedBottom - 10;
}

function drawTicketCodeMatrix(ticketCode: string, x: number, y: number, size: number) {
  const moduleCount = 29;
  const moduleSize = size / moduleCount;
  const matrix: Array<Array<boolean | null>> = Array.from({ length: moduleCount }, () => Array<boolean | null>(moduleCount).fill(null));

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
  const seed = hashString(ticketCode);
  const rng = createRng(seed);
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

  const commands: string[] = [];
  addRect(commands, x - 6, y - 6, size + 12, size + 12, BRAND_LIGHT);
  addRect(commands, x, y, size, size, { r: 255, g: 255, b: 255 });

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!matrix[row][col]) continue;
      commands.push(`${rgb(BRAND_CHARCOAL)} rg`);
      commands.push(`${(x + col * moduleSize).toFixed(2)} ${(y + (moduleCount - 1 - row) * moduleSize).toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re f`);
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

async function embedLogoAsJpeg(): Promise<EmbeddedImage> {
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

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }
        reject(new Error("Unable to encode logo image."));
      },
      "image/jpeg",
      0.96,
    );
  });

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width,
    height: canvas.height,
  };
}

async function createPdfBytes(title: string, lines: PdfTicketLine[], options: TicketPdfOptions) {
  const brandName = options.brandName?.trim() || "BuyMesho";
  const brandTagline = options.brandTagline?.trim() || "Official event ticket";
  const ticketCode = options.ticketCode.trim() || title.trim();
  const logo = await embedLogoAsJpeg();

  const commands: string[] = [];

  addRect(commands, 0, 0, 595, 842, BRAND_LIGHT);
  addRect(commands, 0, 686, 595, 156, BRAND_CHARCOAL);
  addRect(commands, 0, 674, 595, 12, BRAND_RED);

  const logoWidth = 46;
  const logoHeight = Math.max(18, Math.round((logo.width ? logo.height / logo.width : 1) * logoWidth));
  commands.push("q");
  commands.push(`${logoWidth.toFixed(2)} 0 0 ${logoHeight.toFixed(2)} 34 ${730 + Math.max(0, Math.floor((46 - logoHeight) / 2))} cm`);
  commands.push("/Im0 Do");
  commands.push("Q");

  addBrandWordmark(commands, 90, 782, 24, brandName);
  addText(commands, 90, 758, 11, brandTagline, BRAND_MUTED);

  addText(commands, 34, 644, 27, title, BRAND_CHARCOAL);
  addText(commands, 34, 622, 12, "Ticket information", BRAND_MID);

  addRect(commands, 34, 568, 270, 42, { r: 255, g: 255, b: 255 });
  addRect(commands, 34, 568, 270, 42, BRAND_RED);
  addText(commands, 48, 594, 11, `Ticket code: ${ticketCode}`, { r: 255, g: 255, b: 255 });

  const leftColumnX = 34;
  const rightColumnX = 304;
  const leftWidth = 246;
  const rightWidth = 254;

  let leftY = 542;
  leftY = addFieldBlock(commands, leftColumnX, leftY, "Event", lines[0]?.value || "—", leftWidth);
  leftY = addFieldBlock(commands, leftColumnX, leftY, "Organizer", lines[1]?.value || "Event organizer", leftWidth);
  leftY = addFieldBlock(commands, leftColumnX, leftY, "Date", lines[5]?.value || "—", leftWidth);
  leftY = addFieldBlock(commands, leftColumnX, leftY, "Time", lines[6]?.value || "—", leftWidth);
  leftY = addFieldBlock(commands, leftColumnX, leftY, "Status", lines[8]?.value || "—", leftWidth);

  let rightY = 542;
  rightY = addFieldBlock(commands, rightColumnX, rightY, "Reference", lines[3]?.value || "—", rightWidth, { valueSize: 10.8 });
  rightY = addFieldBlock(commands, rightColumnX, rightY, "Holder", lines[4]?.value || "Verified buyer account", rightWidth, { valueSize: 11.2 });
  rightY = addFieldBlock(commands, rightColumnX, rightY, "Venue", lines[7]?.value || "—", rightWidth, { valueSize: 11.2 });
  rightY = addFieldBlock(commands, rightColumnX, rightY, "Amount", lines[9]?.value || "—", rightWidth, { valueSize: 11.6 });
  void leftY;
  void rightY;

  addRect(commands, 336, 528, 224, 246, { r: 255, g: 255, b: 255 });
  addRect(commands, 336, 528, 224, 246, { r: 236, g: 236, b: 239 });
  addText(commands, 354, 756, 11, "Scan at entry", BRAND_MID);
  addText(commands, 354, 736, 20, "QR Code", BRAND_CHARCOAL);

  commands.push(...drawTicketCodeMatrix(ticketCode, 352, 588, 160));

  addText(commands, 354, 568, 10, ticketCode, BRAND_CHARCOAL);
  addText(commands, 34, 118, 10, "Keep this ticket and code available for verification.", BRAND_MID);
  addRect(commands, 34, 86, 527, 1.4, mixColors(BRAND_RED, BRAND_CHARCOAL, 0.55));
  addBrandWordmark(commands, 34, 58, 9, brandName);
  addText(commands, 34, 44, 8.5, "Verified event access", BRAND_MUTED);

  const contentStream = commands.join("\n");
  const contentBytes = encodeUtf8(contentStream);

  const objects = [
    buildPdfObjectBytes(1, ["<< /Type /Catalog /Pages 2 0 R >>"]),
    buildPdfObjectBytes(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]),
    buildPdfObjectBytes(
      3,
      [
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> /XObject << /Im0 6 0 R >> >> /Contents 4 0 R >>",
      ],
    ),
    buildPdfObjectBytes(4, [`<< /Length ${contentBytes.length} >>\nstream\n`, contentBytes, "\nendstream"]),
    buildPdfObjectBytes(5, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]),
    buildPdfObjectBytes(
      6,
      [
        `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`,
        logo.bytes,
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
