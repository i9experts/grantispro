import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";
import { generateAwardsSummaryPdf } from "@/lib/awards-summary-pdf";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campusId = searchParams.get("campusId") || undefined;

  const [tenant, awards, campus] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: session.user.tenantId } }),
    prisma.award.findMany({
      where: {
        fund: { tenantId: session.user.tenantId },
        ...(campusId
          ? {
              OR: [
                { applicant: { campusId } },
                { application: { applicant: { campusId } } },
              ],
            }
          : {}),
      },
      include: {
        applicant: { include: { campus: true, schoolClass: true } },
        application: {
          include: {
            applicant: { include: { campus: true, schoolClass: true } },
            program: { select: { name: true } },
          },
        },
        fund: { select: { name: true } },
      },
      orderBy: { awardedAt: "desc" },
    }),
    campusId ? prisma.campus.findUnique({ where: { id: campusId } }) : null,
  ]);

  const rows = awards.map((a) => {
    const student = a.applicant ?? a.application?.applicant;
    return {
      studentName: student?.fullName ?? "Unknown",
      guardianName: student?.guardianName ?? null,
      contactPhone: student?.contactPhone ?? null,
      campusName: student?.campus?.name ?? null,
      className: student?.schoolClass?.name ?? null,
      programName: a.application?.program.name ?? null,
      fundName: a.fund.name,
      scholarshipName: a.scholarshipName,
      awardType: a.awardType,
      percentValue: a.percentValue,
      amount: Number(a.amount),
      currency: a.currency,
      durationMonths: a.durationMonths,
      reason: a.reason,
      startDate: a.startDate,
    };
  });

  const filterLabel = campus ? `Campus: ${campus.name}` : "All campuses";

  try {
    const pdfBytes = await generateAwardsSummaryPdf(tenant?.name ?? "Institution", filterLabel, rows);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(tenant?.name ?? "grantispro").replace(/\s+/g, "_")}_awards_summary.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Awards summary PDF generation failed:", err?.message ?? err);
    return NextResponse.json({ error: `Report generation failed: ${err?.message ?? "unknown error"}` }, { status: 500 });
  }
}
