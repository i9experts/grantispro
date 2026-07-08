import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Brand colors as PDF RGB (0-1 scale)
const PLUM = rgb(0x3b / 255, 0x1f / 255, 0x3a / 255);
const EMERALD = rgb(0x1f / 255, 0xaa / 255, 0x7c / 255);
const MARIGOLD = rgb(0xd6 / 255, 0x87 / 255, 0x0c / 255);
const IVORY = rgb(0xfb / 255, 0xf7 / 255, 0xf0 / 255);

export type CertificateData = {
  tenantName: string;
  tenantLogoBytes?: Uint8Array | null;
  studentName: string;
  scholarshipName: string;
  awardType: "FULL" | "PARTIAL_PERCENT" | "FIXED_AMOUNT";
  percentValue?: number | null;
  amount: number;
  currency: string;
  reason?: string | null;
  startDate: Date;
  durationMonths?: number | null;
};

function awardDescription(d: CertificateData): string {
  if (d.awardType === "FULL") return "a Full Scholarship (100% fee waiver)";
  if (d.awardType === "PARTIAL_PERCENT") return `a ${d.percentValue}% Scholarship Discount`;
  return `a Fixed Scholarship Award of ${d.currency} ${d.amount.toLocaleString()}`;
}

export async function generateCertificate(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: IVORY });

  // Decorative border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: PLUM,
    borderWidth: 1.5,
  });
  page.drawRectangle({
    x: 34,
    y: 34,
    width: width - 68,
    height: height - 68,
    borderColor: MARIGOLD,
    borderWidth: 0.75,
  });

  let cursorY = height - 90;

  // Logo (if provided)
  if (data.tenantLogoBytes) {
    try {
      let logoImage;
      try {
        logoImage = await pdfDoc.embedPng(data.tenantLogoBytes);
      } catch {
        logoImage = await pdfDoc.embedJpg(data.tenantLogoBytes);
      }
      const logoDims = logoImage.scale(60 / logoImage.height);
      page.drawImage(logoImage, {
        x: width / 2 - logoDims.width / 2,
        y: cursorY - 60,
        width: logoDims.width,
        height: logoDims.height,
      });
      cursorY -= 80;
    } catch {
      // If the logo can't be embedded, just skip it rather than failing the whole certificate.
    }
  }

  // Institution name
  const tenantNameSize = 16;
  const tenantNameWidth = fontBold.widthOfTextAtSize(data.tenantName.toUpperCase(), tenantNameSize);
  page.drawText(data.tenantName.toUpperCase(), {
    x: width / 2 - tenantNameWidth / 2,
    y: cursorY,
    size: tenantNameSize,
    font: fontBold,
    color: PLUM,
  });
  cursorY -= 40;

  // "Certificate of Scholarship"
  const titleSize = 28;
  const title = "Certificate of Scholarship";
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: width / 2 - titleWidth / 2,
    y: cursorY,
    size: titleSize,
    font: fontBold,
    color: PLUM,
  });
  cursorY -= 20;

  page.drawLine({
    start: { x: width / 2 - 60, y: cursorY },
    end: { x: width / 2 + 60, y: cursorY },
    thickness: 2,
    color: MARIGOLD,
  });
  cursorY -= 50;

  // Body text
  const bodySize = 13;
  const line1 = "This certifies that";
  page.drawText(line1, {
    x: width / 2 - fontRegular.widthOfTextAtSize(line1, bodySize) / 2,
    y: cursorY,
    size: bodySize,
    font: fontRegular,
    color: PLUM,
  });
  cursorY -= 36;

  const nameSize = 26;
  page.drawText(data.studentName, {
    x: width / 2 - fontBold.widthOfTextAtSize(data.studentName, nameSize) / 2,
    y: cursorY,
    size: nameSize,
    font: fontBold,
    color: EMERALD,
  });
  cursorY -= 36;

  const desc = awardDescription(data);
  const line2 = `has been awarded ${desc},`;
  page.drawText(line2, {
    x: width / 2 - fontRegular.widthOfTextAtSize(line2, bodySize) / 2,
    y: cursorY,
    size: bodySize,
    font: fontRegular,
    color: PLUM,
  });
  cursorY -= 22;

  const scholarshipLine = `"${data.scholarshipName}"`;
  page.drawText(scholarshipLine, {
    x: width / 2 - fontBold.widthOfTextAtSize(scholarshipLine, bodySize) / 2,
    y: cursorY,
    size: bodySize,
    font: fontBold,
    color: PLUM,
  });
  cursorY -= 22;

  const durationText = data.durationMonths
    ? `for a duration of ${data.durationMonths} month${data.durationMonths === 1 ? "" : "s"},`
    : "on an ongoing basis,";
  const startText = `starting ${data.startDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}.`;
  const line3 = `${durationText} ${startText}`;
  page.drawText(line3, {
    x: width / 2 - fontRegular.widthOfTextAtSize(line3, bodySize) / 2,
    y: cursorY,
    size: bodySize,
    font: fontRegular,
    color: PLUM,
  });

  if (data.reason) {
    cursorY -= 22;
    const reasonLine = `Basis: ${data.reason}`;
    page.drawText(reasonLine, {
      x: width / 2 - fontRegular.widthOfTextAtSize(reasonLine, 11) / 2,
      y: cursorY,
      size: 11,
      font: fontRegular,
      color: PLUM,
    });
  }

  // Footer: issue date + signature line
  const footerY = 90;
  const issuedText = `Issued on ${new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
  page.drawText(issuedText, {
    x: 80,
    y: footerY,
    size: 10,
    font: fontRegular,
    color: PLUM,
  });

  page.drawLine({
    start: { x: width - 260, y: footerY + 24 },
    end: { x: width - 80, y: footerY + 24 },
    thickness: 0.75,
    color: PLUM,
  });
  page.drawText("Authorized Signature", {
    x: width - 260,
    y: footerY + 8,
    size: 10,
    font: fontRegular,
    color: PLUM,
  });

  return pdfDoc.save();
}
