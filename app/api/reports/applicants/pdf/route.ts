import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";
import { generateApplicantRosterPdf } from "@/lib/applicant-roster-pdf";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campusId = searchParams.get("campusId") || undefined;
  const classId = searchParams.get("classId") || undefined;

  const [tenant, applicants, campus, schoolClass] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: session.user.tenantId } }),
    prisma.applicant.findMany({
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
    }),
    campusId ? prisma.campus.findUnique({ where: { id: campusId } }) : null,
    classId ? prisma.schoolClass.findUnique({ where: { id: classId } }) : null,
  ]);

  const filterParts: string[] = [];
  if (campus) filterParts.push(`Campus: ${campus.name}`);
  if (schoolClass) filterParts.push(`Class: ${schoolClass.name}`);
  const filterLabel = filterParts.length > 0 ? filterParts.join(" · ") : "All campuses and classes";

  try {
    const pdfBytes = await generateApplicantRosterPdf(
      tenant?.name ?? "Institution",
      filterLabel,
      applicants.map((a) => ({
        fullName: a.fullName,
        guardianName: a.guardianName,
        contactEmail: a.contactEmail,
        contactPhone: a.contactPhone,
        campusName: a.campus?.name ?? null,
        className: a.schoolClass?.name ?? null,
        isZakatEligible: a.isZakatEligible,
        latestProgram: a.applications[0]?.program.name ?? null,
        latestStatus: a.applications[0]?.status ?? null,
      }))
    );

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(tenant?.name ?? "grantispro").replace(/\s+/g, "_")}_applicant_roster.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Applicant roster PDF generation failed:", err?.message ?? err);
    return NextResponse.json({ error: `Report generation failed: ${err?.message ?? "unknown error"}` }, { status: 500 });
  }
}
