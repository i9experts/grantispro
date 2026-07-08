import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

// Returns applicants from this program whose application has progressed
// far enough to be grant-ready (Shortlisted or Awarded) — this is what
// feeds the Grant Scholarship flow when granting against a specific
// program's applicant pool, rather than picking from every student in
// the tenant.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.scholarshipProgram.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const applications = await prisma.application.findMany({
    where: {
      programId: program.id,
      status: { in: ["SHORTLISTED", "AWARDED"] },
    },
    include: { applicant: true },
    orderBy: { eligibilityScore: "desc" },
  });

  return NextResponse.json({
    applicants: applications.map((a) => ({
      id: a.applicant.id,
      fullName: a.applicant.fullName,
      photoUrl: a.applicant.photoUrl,
      isZakatEligible: a.applicant.isZakatEligible,
      applicationStatus: a.status,
      eligibilityScore: a.eligibilityScore,
    })),
  });
}
