import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from "pdf-lib";
import { formatCurrency, fundCategoryLabel } from "@/lib/currency";

const PLUM = rgb(0x3b / 255, 0x1f / 255, 0x3a / 255);
const EMERALD = rgb(0x1f / 255, 0xaa / 255, 0x7c / 255);
const MARIGOLD = rgb(0xd6 / 255, 0x87 / 255, 0x0c / 255);
const IVORY = rgb(0xfb / 255, 0xf7 / 255, 0xf0 / 255);
const MUTED = rgb(0x7c / 255, 0x6b / 255, 0x7a / 255);

const AWARD_TYPE_LABEL: Record<string, string> = {
  FULL: "Full Scholarship",
  PARTIAL_PERCENT: "Partial %",
  FIXED_AMOUNT: "Fixed Amount",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  SHORTLISTED: "Shortlisted",
  AWARDED: "Awarded",
  REJECTED: "Rejected",
  RENEWED: "Renewed",
};

const DONOR_TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: "Individual",
  CORPORATE_CSR: "Corporate CSR",
  GOVERNMENT_GRANT: "Government grant",
  FOREIGN_FUNDING: "Foreign funding",
};

export async function generateReportPdf(summary: any, logoBytes: Uint8Array | null): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]); // A4 portrait
  const margin = 50;
  const contentWidth = 595 - margin * 2;
  let y = 842 - margin;

  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = pdfDoc.addPage([595, 842]);
      y = 842 - margin;
    }
  }

  function drawHeading(text: string) {
    ensureSpace(40);
    y -= 8;
    page.drawText(text, { x: margin, y, size: 15, font: fontBold, color: PLUM });
    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: MARIGOLD });
    y -= 18;
  }

  function drawRow(label: string, value: string) {
    ensureSpace(18);
    page.drawText(label, { x: margin, y, size: 10.5, font: fontRegular, color: MUTED });
    const valueWidth = fontBold.widthOfTextAtSize(value, 10.5);
    page.drawText(value, { x: margin + contentWidth - valueWidth, y, size: 10.5, font: fontBold, color: PLUM });
    y -= 17;
  }

  // Header
  if (logoBytes) {
    try {
      let logoImage;
      try {
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch {
        logoImage = await pdfDoc.embedJpg(logoBytes);
      }
      const dims = logoImage.scale(36 / logoImage.height);
      page.drawImage(logoImage, { x: margin, y: y - 30, width: dims.width, height: dims.height });
    } catch {
      // skip logo silently if it can't be embedded
    }
  }
  page.drawText(summary.tenantName ?? "Institution", {
    x: margin + (logoBytes ? 50 : 0),
    y: y - 8,
    size: 18,
    font: fontBold,
    color: PLUM,
  });
  page.drawText(
    `Scholarship & Donor Report — generated ${new Date(summary.generatedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    { x: margin + (logoBytes ? 50 : 0), y: y - 26, size: 10, font: fontRegular, color: MUTED }
  );
  y -= 60;

  // Scholarships section
  drawHeading("Scholarships");
  drawRow("Total scholarships granted", String(summary.scholarships.totalGranted));
  for (const [type, count] of Object.entries(summary.scholarships.byType)) {
    drawRow(`  ${AWARD_TYPE_LABEL[type] ?? type}`, String(count));
  }
  for (const [currency, amount] of Object.entries(summary.scholarships.totalByCurrency)) {
    drawRow(`Total value granted (${currency})`, formatCurrency(amount as number, currency));
  }
  y -= 10;

  // Applications section
  drawHeading("Applications");
  drawRow("Total applications", String(summary.applications.total));
  for (const [status, count] of Object.entries(summary.applications.byStatus)) {
    drawRow(`  ${STATUS_LABEL[status] ?? status}`, String(count));
  }
  if (summary.applications.averageScore !== null) {
    drawRow("Average eligibility score", String(summary.applications.averageScore));
  }
  y -= 10;

  // Programs section
  drawHeading("Programs");
  drawRow("Total programs", String(summary.programs.total));
  drawRow("Active programs", String(summary.programs.active));
  for (const p of summary.programs.list) {
    drawRow(`  ${p.name}`, `${p.applications} applications`);
  }
  y -= 10;

  // Donors section
  drawHeading("Donors and pledges");
  drawRow("Total donors", String(summary.donors.total));
  for (const [type, count] of Object.entries(summary.donors.byType)) {
    drawRow(`  ${DONOR_TYPE_LABEL[type] ?? type}`, String(count));
  }
  drawRow("Pledges received", String(summary.pledges.received));
  drawRow("Pledges committed (not yet received)", String(summary.pledges.committedOnly));
  for (const [currency, amount] of Object.entries(summary.pledges.totalByCurrency)) {
    drawRow(`Total pledged (${currency})`, formatCurrency(amount as number, currency));
  }
  y -= 10;

  // Funds section
  drawHeading("Funds by category");
  for (const [category, balance] of Object.entries(summary.funds.byCategory)) {
    drawRow(`  ${fundCategoryLabel(category)}`, formatCurrency(balance as number, summary.defaultCurrency));
  }
  y -= 10;

  // Zakat section
  drawHeading("Zakat");
  drawRow("Zakat-eligible students on record", String(summary.zakat.eligibleApplicants));

  // Footer disclaimer
  ensureSpace(40);
  y -= 20;
  page.drawText(
    "This report aggregates figures as tracked in Grantispro. Amounts in different currencies are shown",
    { x: margin, y, size: 8, font: fontRegular, color: MUTED }
  );
  y -= 11;
  page.drawText(
    "separately rather than converted. Verify against your accounting records before external use.",
    { x: margin, y, size: 8, font: fontRegular, color: MUTED }
  );

  return pdfDoc.save();
}
