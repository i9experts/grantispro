import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campusId = searchParams.get("campusId") || undefined;

  const awards = await prisma.award.findMany({
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
  });

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

  return NextResponse.json({ awards: rows });
}
