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

const BRAND_RED: PdfColor = { r: 175, g: 25, b: 42 };
const BRAND_CHARCOAL: PdfColor = { r: 24, g: 24, b: 27 };
const BRAND_MID: PdfColor = { r: 84, g: 84, b: 99 };
const BRAND_LIGHT: PdfColor = { r: 244, g: 244, b: 245 };
const BRAND_PANEL: PdfColor = { r: 255, g: 255, b: 255 };
const BRAND_BORDER: PdfColor = { r: 228, g: 228, b: 231 };

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfObject(id: number, body: string) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

function encodePdfString(input: string) {
  return new TextEncoder().encode(input);
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

function drawWordmark(commands: string[], x: number, y: number, darkBackground: boolean) {
  const badgeColor = BRAND_RED;
  const buyColor = BRAND_RED;
  const meshoColor = darkBackground ? { r: 235, g: 235, b: 240 } : BRAND_CHARCOAL;
  const subColor = darkBackground ? { r: 220, g: 220, b: 225 } : BRAND_MID;

  addRect(commands, x, y, 232, 54, darkBackground ? BRAND_PANEL : { r: 255, g: 255, b: 255 });
  addRect(commands, x + 10, y + 10, 34, 34, badgeColor);
  addText(commands, x + 15, y + 31, 12, "BM", { r: 255, g: 255, b: 255 });
  addText(commands, x + 54, y + 34, 17, "Buy", buyColor);
  addText(commands, x + 92, y + 34, 17, "Mesho", meshoColor);
  addText(commands, x + 54, y + 17, 7.5, "Official event ticket", subColor);
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

function createPdfBytes(title: string, lines: PdfTicketLine[], options: TicketPdfOptions) {
  const brandName = options.brandName?.trim() || "BuyMesho";
  const brandTagline = options.brandTagline?.trim() || "Official event ticket";
  const ticketCode = options.ticketCode.trim() || title.trim();

  const commands: string[] = [];

  addRect(commands, 0, 0, 595, 842, BRAND_LIGHT);
  addRect(commands, 0, 690, 595, 152, BRAND_CHARCOAL);
  addRect(commands, 0, 678, 595, 12, BRAND_RED);

  drawWordmark(commands, 26, 735, true);
  addText(commands, 34, 648, 26, title, BRAND_CHARCOAL);
  addText(commands, 34, 626, 12, "Ticket information", BRAND_MID);

  addRect(commands, 34, 566, 260, 42, BRAND_RED);
  addText(commands, 48, 592, 11, `Ticket code: ${ticketCode}`, { r: 255, g: 255, b: 255 });

  const detailTop = 546;
  const lineGap = 32;
  let currentY = detailTop;

  lines.forEach((line) => {
    const label = line.label.trim();
    const value = line.value.trim();
    addText(commands, 34, currentY, 9, label.toUpperCase(), BRAND_MID);
    addText(commands, 34, currentY - 14, 12, value || "—", BRAND_CHARCOAL);
    currentY -= lineGap;
  });

  addRect(commands, 338, 540, 223, 240, BRAND_PANEL);
  addRect(commands, 338, 540, 223, 240, BRAND_BORDER);
  addText(commands, 356, 756, 11, "Scan at entry", BRAND_MID);
  addText(commands, 356, 736, 20, "QR Code", BRAND_CHARCOAL);

  commands.push(...drawTicketCodeMatrix(ticketCode, 355, 586, 160));

  addText(commands, 356, 566, 10, ticketCode, BRAND_CHARCOAL);
  addText(commands, 34, 90, 10, "Keep this ticket and code available for verification.", BRAND_MID);
  addRect(commands, 34, 50, 527, 1.5, mixColors(BRAND_RED, BRAND_CHARCOAL, 0.55));
  drawWordmark(commands, 34, 12, false);

  const contentStream = commands.join("\n");
  const objects = [
    buildPdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    buildPdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    buildPdfObject(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    ),
    buildPdfObject(
      4,
      `<< /Length ${encodePdfString(contentStream).length} >>\nstream\n${contentStream}\nendstream`,
    ),
    buildPdfObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
  ];

  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object) => {
    offsets.push(encodePdfString(output).length);
    output += object;
  });

  const xrefOffset = encodePdfString(output).length;
  output += `xref\n0 ${objects.length + 1}\n`;
  output += `0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encodePdfString(output);
}

export function createTicketPdfBlob(title: string, lines: PdfTicketLine[], options: TicketPdfOptions) {
  return new Blob([createPdfBytes(title, lines, options)], { type: "application/pdf" });
}

export function downloadTicketPdf(filename: string, title: string, lines: PdfTicketLine[], options: TicketPdfOptions) {
  const blob = createTicketPdfBlob(title, lines, options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
