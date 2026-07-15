import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";

// Palette echoing the reference certificate: deep green-black text,
// gold/marigold rule lines and border, warm ivory background.
const INK = rgb(0x22 / 255, 0x33 / 255, 0x2b / 255);
const GOLD = rgb(0xc8 / 255, 0xa0 / 255, 0x35 / 255);
const GOLD_DEEP = rgb(0xa8 / 255, 0x82 / 255, 0x1c / 255);
const MUTED = rgb(0x5a / 255, 0x5a / 255, 0x54 / 255);
const IVORY = rgb(0xfd / 255, 0xfc / 255, 0xf7 / 255);

export type CertificateData = {
  tenantName: string;
  tenantLogoBytes?: Uint8Array | null;
  campusName?: string | null;
  studentName: string;
  scholarshipName: string;
  awardType: "FULL" | "PARTIAL_PERCENT" | "FIXED_AMOUNT";
  percentValue?: number | null;
  amount: number;
  currency: string;
  reason?: string | null;
  startDate: Date;
  durationMonths?: number | null;
  isIslamicInstitution: boolean;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
};

function academicYearLabel(startDate: Date, durationMonths?: number | null): string {
  const startYear = startDate.getFullYear();
  const spanMonths = durationMonths ?? 12;
  const endDate = new Date(startDate.getTime());
  endDate.setMonth(endDate.getMonth() + spanMonths);
  const endYear = endDate.getFullYear();
  return startYear === endYear ? `${startYear}` : `${startYear}\u2013${endYear}`;
}

function grantDescription(d: CertificateData): string {
  const yearLabel = academicYearLabel(d.startDate, d.durationMonths);
  if (d.awardType === "FULL") {
    return `Full Scholarship (100% Tuition Fee Waiver)\nfor the Academic Year ${yearLabel}`;
  }
  if (d.awardType === "PARTIAL_PERCENT") {
    return `${d.percentValue}% Tuition Fee Waiver\nfor the Academic Year ${yearLabel}`;
  }
  return `${d.currency} ${d.amount.toLocaleString()} Fixed Scholarship Award\nfor the Academic Year ${yearLabel}`;
}

// Simple word-wrap for pdf-lib, which has no built-in text flow.
function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateCertificate(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let scriptFont = fontBold;
  try {
    const scriptBytes = fs.readFileSync(path.join(process.cwd(), "lib/fonts/GreatVibes-Regular.ttf"));
    scriptFont = await pdfDoc.embedFont(scriptBytes);
  } catch {
    // Falls back to bold Helvetica if the script font can't be read —
    // still functional, just less elegant.
  }

  // Background + double gold border, echoing the reference's ornate frame
  // (without attempting to replicate the hand-drawn corner flourishes,
  // which aren't realistic to reproduce with primitive PDF drawing).
  page.drawRectangle({ x: 0, y: 0, width, height, color: IVORY });
  page.drawRectangle({
    x: 22, y: 22, width: width - 44, height: height - 44,
    borderColor: GOLD, borderWidth: 2,
  });
  page.drawRectangle({
    x: 30, y: 30, width: width - 60, height: height - 60,
    borderColor: GOLD, borderWidth: 0.75,
  });

  let y = height - 62;
  const centerX = width / 2;

  // Logo
  if (data.tenantLogoBytes) {
    try {
      let logoImage;
      try {
        logoImage = await pdfDoc.embedPng(data.tenantLogoBytes);
      } catch {
        logoImage = await pdfDoc.embedJpg(data.tenantLogoBytes);
      }
      const dims = logoImage.scale(52 / logoImage.height);
      page.drawImage(logoImage, { x: centerX - dims.width / 2, y: y - 52, width: dims.width, height: dims.height });
      y -= 66;
    } catch {
      // Skip logo silently if it can't be embedded.
    }
  }

  // Institution name
  const nameSize = 17;
  const nameW = fontBold.widthOfTextAtSize(data.tenantName, nameSize);
  page.drawText(data.tenantName, { x: centerX - nameW / 2, y, size: nameSize, font: fontBold, color: INK });
  y -= 20;

  // Campus badge, if the student has one (mirrors the reference's "Fatima Campus" tag)
  if (data.campusName) {
    const campusSize = 10;
    const campusW = fontRegular.widthOfTextAtSize(data.campusName, campusSize);
    const pad = 10;
    page.drawRectangle({
      x: centerX - campusW / 2 - pad, y: y - 4, width: campusW + pad * 2, height: 16,
      color: rgb(0xf3 / 255, 0xe9 / 255, 0xc4 / 255),
    });
    page.drawText(data.campusName, { x: centerX - campusW / 2, y, size: campusSize, font: fontRegular, color: GOLD_DEEP });
    y -= 26;
  } else {
    y -= 8;
  }

  // Student name
  const studentSize = 26;
  const studentW = fontBold.widthOfTextAtSize(data.studentName.toUpperCase(), studentSize);
  page.drawText(data.studentName.toUpperCase(), {
    x: centerX - studentW / 2, y, size: studentSize, font: fontBold, color: INK,
  });
  y -= 22;

  // Reason subtitle
  if (data.reason) {
    const reasonSize = 12;
    const reasonW = fontRegular.widthOfTextAtSize(data.reason, reasonSize);
    page.drawText(data.reason, { x: centerX - reasonW / 2, y, size: reasonSize, font: fontRegular, color: MUTED });
    y -= 26;
  }

  // "Certificate of Scholarship" in script
  const scriptSize = 34;
  const scriptText = "Certificate of Scholarship";
  const scriptW = scriptFont.widthOfTextAtSize(scriptText, scriptSize);
  page.drawText(scriptText, { x: centerX - scriptW / 2, y, size: scriptSize, font: scriptFont, color: GOLD_DEEP });
  y -= 26;

  const awardedToSize = 11;
  const awardedToText = "This certificate is awarded to";
  const awardedToW = fontItalic.widthOfTextAtSize(awardedToText, awardedToSize);
  page.drawText(awardedToText, { x: centerX - awardedToW / 2, y, size: awardedToSize, font: fontItalic, color: MUTED });
  y -= 20;

  page.drawLine({ start: { x: centerX - 180, y }, end: { x: centerX + 180, y }, thickness: 0.75, color: GOLD });
  y -= 26;

  // Acknowledgment paragraph, word-wrapped
  const ackText = `In acknowledgment of your commitment to education, ${data.tenantName} is honored to grant you the:`;
  const ackSize = 11.5;
  const ackLines = wrapText(ackText, fontRegular, ackSize, 520);
  for (const line of ackLines) {
    const lineW = fontRegular.widthOfTextAtSize(line, ackSize);
    page.drawText(line, { x: centerX - lineW / 2, y, size: ackSize, font: fontRegular, color: INK });
    y -= 16;
  }
  y -= 8;

  // Grant detail (two lines: amount/type, academic year)
  const grantLines = grantDescription(data).split("\n");
  for (const line of grantLines) {
    const size = 14;
    const lw = fontBold.widthOfTextAtSize(line, size);
    page.drawText(line, { x: centerX - lw / 2, y, size, font: fontBold, color: GOLD_DEEP });
    y -= 18;
  }
  y -= 12;

  // Closing message — Islamic blessing only for Islamic/Waqf institutions,
  // a neutral closing otherwise. This mirrors the Zakat-eligibility pattern:
  // religious content only appears where the institution type calls for it.
  const closing = data.isIslamicInstitution
    ? "May Allah ease your affairs, increase your barakah, and make you among those who benefit the Ummah."
    : "We wish you continued success and every encouragement in your educational journey.";
  const closingSize = 10.5;
  const closingLines = wrapText(closing, fontItalic, closingSize, 480);
  for (const line of closingLines) {
    const lw = fontItalic.widthOfTextAtSize(line, closingSize);
    page.drawText(line, { x: centerX - lw / 2, y, size: closingSize, font: fontItalic, color: MUTED });
    y -= 15;
  }

  // Footer: award date (left-ish, centered block) + signature (right)
  const footerY = 78;
  const awardedOnLabel = `Awarded on: ${data.startDate.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })}`;
  page.drawText(awardedOnLabel, { x: 80, y: footerY, size: 10.5, font: fontRegular, color: INK });

  const sigX2 = width - 80;
  const sigX1 = width - 260;
  page.drawLine({ start: { x: sigX1, y: footerY + 26 }, end: { x: sigX2, y: footerY + 26 }, thickness: 0.75, color: INK });
  const sigName = data.signatoryName || data.tenantName;
  page.drawText(sigName, { x: sigX1, y: footerY + 12, size: 11, font: fontBold, color: INK });
  if (data.signatoryTitle) {
    page.drawText(data.signatoryTitle, { x: sigX1, y: footerY - 2, size: 9.5, font: fontRegular, color: MUTED });
  }

  return pdfDoc.save();
}
