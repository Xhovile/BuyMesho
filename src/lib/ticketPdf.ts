type PdfTicketLine = {
  label: string;
  value: string;
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfObject(id: number, body: string) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

function encodePdfString(input: string) {
  return new TextEncoder().encode(input);
}

function createPdfBytes(title: string, lines: PdfTicketLine[]) {
  const contentParts: string[] = [
    "BT",
    "/F1 18 Tf",
    "72 760 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 11 Tf",
    "0 -28 Td",
  ];

  lines.forEach((line) => {
    contentParts.push(`(${escapePdfText(`${line.label}: ${line.value}`)}) Tj`);
    contentParts.push("0 -18 Td");
  });
  contentParts.push("ET");

  const contentStream = contentParts.join("\n");
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

export function createTicketPdfBlob(title: string, lines: PdfTicketLine[]) {
  return new Blob([createPdfBytes(title, lines)], { type: "application/pdf" });
}

export function downloadTicketPdf(filename: string, title: string, lines: PdfTicketLine[]) {
  const blob = createTicketPdfBlob(title, lines);
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
