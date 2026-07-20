import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const PLUM = rgb(0x3b / 255, 0x1f / 255, 0x3a / 255);
const MARIGOLD = rgb(0xd6 / 255, 0x87 / 255, 0x0c / 255);
const EMERALD = rgb(0x0e / 255, 0x7a / 255, 0x57 / 255);
const MUTED = rgb(0x7c / 255, 0x6b / 255, 0x7a / 255);
const ROW_ALT = rgb(0xf6 / 255, 0xf1 / 255, 0xea / 255);
const CAMPUS_BAND = rgb(0x3b / 255, 0x1f / 255, 0x3a / 255);

export type AwardRow = {
  studentName: string;
  guardianName: string | null;
  contactPhone: string | null;
  campusName: string | null;
  className: string | null;
  programName: string | null;
  fundName: string;
  scholarshipName: string;
  awardType: "FULL" | "PARTIAL_PERCENT" | "FIXED_AMOUNT";
  percentValue: number | null;
  amount: number;
  currency: string;
  durationMonths: number | null;
  reason: string | null;
  startDate: string | Date;
};

const COLUMNS = [
  { key: "sno", label: "S#", width: 24 },
  { key: "studentName", label: "Student Name", width: 95 },
  { key: "guardianName", label: "Parent / Guardian", width: 80 },
  { key: "contactPhone", label: "Phone", width: 62 },
  { key: "className", label: "Class", width: 48 },
  { key: "programName", label: "Program", width: 90 },
  { key: "awardType", label: "Award Type", width: 78 },
  { key: "amount", label: "Amount", width: 65 },
  { key: "durationMonths", label: "Duration", width: 55 },
  { key: "reason", label: "Reason", width: 75 },
] as const;

function awardTypeLabel(a: AwardRow): string {
  if (a.awardType === "FULL") return "Full";
  if (a.awardType === "PARTIAL_PERCENT") return `${a.percentValue}% Partial`;
  return "Fixed";
}

function truncate(font: any, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

export async function generateAwardsSummaryPdf(
  tenantName: string,
  filterLabel: string,
  awards: AwardRow[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 40;
  const rowHeight = 20;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function drawDocHeader() {
    page.drawText(tenantName, { x: margin, y, size: 16, font: fontBold, color: PLUM });
    y -= 20;
    page.drawText("Scholarship Awards Summary — by Campus", { x: margin, y, size: 12, font: fontRegular, color: MUTED });
    y -= 16;
    page.drawText(filterLabel, { x: margin, y, size: 9.5, font: fontRegular, color: MUTED });
    y -= 14;
    page.drawText(
      `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} — ${awards.length} scholarship(s) awarded`,
      { x: margin, y, size: 9, font: fontRegular, color: MUTED }
    );
    y -= 24;
  }

  function drawColumnHeaders() {
    let x = margin;
    for (const col of COLUMNS) {
      page.drawText(col.label, { x, y, size: 8.5, font: fontBold, color: PLUM });
      x += col.width;
    }
    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: MARIGOLD });
    y -= 14;
  }

  function newPage() {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  function ensureSpace(needed: number) {
    if (y < margin + needed) {
      newPage();
      drawColumnHeaders();
    }
  }

  function drawCampusBand(label: string) {
    ensureSpace(30);
    page.drawRectangle({ x: margin - 4, y: y - 4, width: pageWidth - margin * 2 + 8, height: 18, color: CAMPUS_BAND });
    page.drawText(label, { x: margin, y, size: 10.5, font: fontBold, color: rgb(1, 1, 1) });
    y -= 22;
    drawColumnHeaders();
  }

  drawDocHeader();

  // Group by campus (awards with no campus go in their own bucket at the end)
  const byCampus = new Map<string, AwardRow[]>();
  for (const a of awards) {
    const key = a.campusName ?? "\uFFFFNo Campus Assigned"; // sort marker pushes it last
    if (!byCampus.has(key)) byCampus.set(key, []);
    byCampus.get(key)!.push(a);
  }
  const campusNames = Array.from(byCampus.keys()).sort();

  const grandTotalByCurrency: Record<string, number> = {};

  for (const campusKey of campusNames) {
    const rows = byCampus.get(campusKey)!;
    const displayName = campusKey.startsWith("\uFFFF") ? "No Campus Assigned" : campusKey;
    drawCampusBand(`${displayName} — ${rows.length} award(s)`);

    const subtotalByCurrency: Record<string, number> = {};

    rows.forEach((a, i) => {
      ensureSpace(rowHeight);

      if (i % 2 === 0) {
        page.drawRectangle({
          x: margin - 4, y: y - 5, width: pageWidth - margin * 2 + 8, height: rowHeight - 4,
          color: ROW_ALT,
        });
      }

      const rowValues: Record<string, string> = {
        sno: String(i + 1),
        studentName: a.studentName,
        guardianName: a.guardianName ?? "—",
        contactPhone: a.contactPhone ?? "—",
        className: a.className ?? "—",
        programName: a.programName ?? "Direct grant",
        awardType: awardTypeLabel(a),
        amount: `${a.currency} ${a.amount.toLocaleString()}`,
        durationMonths: a.durationMonths ? `${a.durationMonths} mo` : "Ongoing",
        reason: a.reason ?? "—",
      };

      let x = margin;
      for (const col of COLUMNS) {
        const text = truncate(fontRegular, rowValues[col.key], 8.5, col.width - 6);
        page.drawText(text, { x, y, size: 8.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
        x += col.width;
      }
      y -= rowHeight;

      subtotalByCurrency[a.currency] = (subtotalByCurrency[a.currency] ?? 0) + a.amount;
      grandTotalByCurrency[a.currency] = (grandTotalByCurrency[a.currency] ?? 0) + a.amount;
    });

    ensureSpace(16);
    const subtotalText = `Subtotal — ${displayName}: ${Object.entries(subtotalByCurrency)
      .map(([c, amt]) => `${c} ${amt.toLocaleString()}`)
      .join(", ")}`;
    page.drawText(subtotalText, { x: margin, y, size: 9, font: fontBold, color: EMERALD });
    y -= 24;
  }

  ensureSpace(30);
  page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: pageWidth - margin, y: y + 8 }, thickness: 1, color: PLUM });
  const grandTotalText = `Grand Total — All Campuses: ${
    Object.entries(grandTotalByCurrency).map(([c, amt]) => `${c} ${amt.toLocaleString()}`).join(", ") || "—"
  }`;
  page.drawText(grandTotalText, { x: margin, y, size: 11, font: fontBold, color: PLUM });

  if (awards.length === 0) {
    page.drawText("No scholarships have been awarded yet.", { x: margin, y: y - 20, size: 10, font: fontRegular, color: MUTED });
  }

  return pdfDoc.save();
}
