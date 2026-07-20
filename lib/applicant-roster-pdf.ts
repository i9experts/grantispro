import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const PLUM = rgb(0x3b / 255, 0x1f / 255, 0x3a / 255);
const MARIGOLD = rgb(0xd6 / 255, 0x87 / 255, 0x0c / 255);
const MUTED = rgb(0x7c / 255, 0x6b / 255, 0x7a / 255);
const ROW_ALT = rgb(0xf6 / 255, 0xf1 / 255, 0xea / 255);

export type RosterApplicant = {
  fullName: string;
  guardianName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  campusName: string | null;
  className: string | null;
  isZakatEligible: boolean;
  latestProgram: string | null;
  latestStatus: string | null;
  appliedDate: string | Date | null;
};

const COLUMNS = [
  { key: "fullName", label: "Student Name", width: 90 },
  { key: "guardianName", label: "Parent / Guardian", width: 78 },
  { key: "contactEmail", label: "Email", width: 112 },
  { key: "contactPhone", label: "Phone", width: 62 },
  { key: "campusName", label: "Campus", width: 58 },
  { key: "className", label: "Class", width: 48 },
  { key: "latestProgram", label: "Program", width: 85 },
  { key: "appliedDate", label: "Applied", width: 58 },
  { key: "latestStatus", label: "Status", width: 55 },
  { key: "isZakatEligible", label: "Zakat", width: 36 },
] as const;

function truncate(font: any, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

export async function generateApplicantRosterPdf(
  tenantName: string,
  filterLabel: string,
  applicants: RosterApplicant[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 40;
  const rowHeight = 20;
  const headerHeight = 90;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function drawHeader(isFirstPage: boolean) {
    if (isFirstPage) {
      page.drawText(tenantName, { x: margin, y, size: 16, font: fontBold, color: PLUM });
      y -= 20;
      page.drawText("Applicant Roster", { x: margin, y, size: 12, font: fontRegular, color: MUTED });
      y -= 16;
      page.drawText(filterLabel, { x: margin, y, size: 9.5, font: fontRegular, color: MUTED });
      y -= 14;
      page.drawText(
        `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} — ${applicants.length} student(s)`,
        { x: margin, y, size: 9, font: fontRegular, color: MUTED }
      );
      y -= 20;
    }

    // Column headers
    let x = margin;
    for (const col of COLUMNS) {
      page.drawText(col.label, { x, y, size: 8.5, font: fontBold, color: PLUM });
      x += col.width;
    }
    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: MARIGOLD });
    y -= 14;
  }

  drawHeader(true);

  applicants.forEach((a, i) => {
    if (y < margin + rowHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeader(false);
    }

    if (i % 2 === 0) {
      page.drawRectangle({
        x: margin - 4, y: y - 5, width: pageWidth - margin * 2 + 8, height: rowHeight - 4,
        color: ROW_ALT,
      });
    }

    const rowValues: Record<string, string> = {
      fullName: a.fullName,
      guardianName: a.guardianName ?? "—",
      contactEmail: a.contactEmail ?? "—",
      contactPhone: a.contactPhone ?? "—",
      campusName: a.campusName ?? "—",
      className: a.className ?? "—",
      latestProgram: a.latestProgram ?? "—",
      appliedDate: a.appliedDate ? new Date(a.appliedDate).toLocaleDateString("en-US", { year: "2-digit", month: "short", day: "numeric" }) : "—",
      latestStatus: a.latestStatus ? a.latestStatus.replace("_", " ") : "—",
      isZakatEligible: a.isZakatEligible ? "Yes" : "—",
    };

    let x = margin;
    for (const col of COLUMNS) {
      const text = truncate(fontRegular, rowValues[col.key], 8.5, col.width - 6);
      page.drawText(text, { x, y, size: 8.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      x += col.width;
    }
    y -= rowHeight;
  });

  if (applicants.length === 0) {
    page.drawText("No students match this filter.", { x: margin, y, size: 10, font: fontRegular, color: MUTED });
  }

  return pdfDoc.save();
}
