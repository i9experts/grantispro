import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campusId = searchParams.get("campusId") || undefined;
  const classId = searchParams.get("classId") || undefined;

  const applicants = await prisma.applicant.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(campusId ? { campusId } : {}),
      ...(classId ? { classId } : {}),
    },
    include: {
      campus: true,
      schoolClass: true,
      applications: {
        select: { status: true, program: { select: { name: true } } },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({
    applicants: applicants.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      guardianName: a.guardianName,
      contactEmail: a.contactEmail,
      contactPhone: a.contactPhone,
      campusName: a.campus?.name ?? null,
      className: a.schoolClass?.name ?? null,
      isZakatEligible: a.isZakatEligible,
      latestProgram: a.applications[0]?.program.name ?? null,
      latestStatus: a.applications[0]?.status ?? null,
      createdAt: a.createdAt,
    })),
  });
}
