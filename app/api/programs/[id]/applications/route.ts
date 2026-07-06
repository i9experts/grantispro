import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.scholarshipProgram.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { criteriaBlocks: true },
  });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const applications = await prisma.application.findMany({
    where: { programId: program.id },
    include: { applicant: true },
    orderBy: [{ eligibilityScore: "desc" }, { submittedAt: "asc" }],
  });

  const labelById = Object.fromEntries(program.criteriaBlocks.map((c) => [c.id, c.label]));

  return NextResponse.json({
    program: { id: program.id, name: program.name, logicType: program.logicType },
    applications: applications.map((a) => {
      const rawMetadata = (a.applicant.metadata as Record<string, string>) ?? {};
      const answers = Object.fromEntries(
        Object.entries(rawMetadata).map(([k, v]) => [labelById[k] ?? k, v])
      );
      return {
        id: a.id,
        status: a.status,
        eligibilityScore: a.eligibilityScore,
        submittedAt: a.submittedAt,
        applicant: {
          fullName: a.applicant.fullName,
          contactEmail: a.applicant.contactEmail,
          contactPhone: a.applicant.contactPhone,
          metadata: answers,
        },
      };
    }),
  });
}
