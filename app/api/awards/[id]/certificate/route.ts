import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";
import { generateCertificate } from "@/lib/certificate";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const award = await prisma.award.findFirst({
    where: { id: params.id, fund: { tenantId: session.user.tenantId } },
    include: {
      applicant: true,
      application: { include: { applicant: true } },
      fund: { include: { tenant: true } },
    },
  });

  if (!award) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const student = award.applicant ?? award.application?.applicant;
  if (!student) return NextResponse.json({ error: "No student on this award" }, { status: 400 });

  let logoBytes: Uint8Array | null = null;
  if (award.fund.tenant.logoUrl) {
    try {
      const res = await fetch(award.fund.tenant.logoUrl);
      if (res.ok) logoBytes = new Uint8Array(await res.arrayBuffer());
    } catch {
      // Missing/unreachable logo shouldn't block certificate generation.
    }
  }

  const pdfBytes = await generateCertificate({
    tenantName: award.fund.tenant.name,
    tenantLogoBytes: logoBytes,
    studentName: student.fullName,
    scholarshipName: award.scholarshipName,
    awardType: award.awardType,
    percentValue: award.percentValue,
    amount: Number(award.amount),
    currency: award.currency,
    reason: award.reason,
    startDate: award.startDate,
    durationMonths: award.durationMonths,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${student.fullName.replace(/\s+/g, "_")}_certificate.pdf"`,
    },
  });
}
