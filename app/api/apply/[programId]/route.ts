import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { evaluateEligibility } from "@/lib/eligibility";

export const dynamic = "force-dynamic";

// Public endpoint — no auth. Applicants access this via a shared link.
// Only exposes what's needed to render the form; never tenant-internal data.
export async function GET(req: NextRequest, { params }: { params: { programId: string } }) {
  const program = await prisma.scholarshipProgram.findUnique({
    where: { id: params.programId },
    include: {
      criteriaBlocks: { orderBy: { createdAt: "asc" } },
      tenant: { select: { name: true, institutionType: true } },
    },
  });

  if (!program || !program.isActive) {
    return NextResponse.json({ error: "This scholarship program isn't accepting applications." }, { status: 404 });
  }

  const [campuses, classes] = await Promise.all([
    prisma.campus.findMany({ where: { tenantId: program.tenantId }, orderBy: { name: "asc" } }),
    prisma.schoolClass.findMany({ where: { tenantId: program.tenantId }, orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    program: {
      id: program.id,
      name: program.name,
      description: program.description,
      tenantName: program.tenant.name,
      institutionType: program.tenant.institutionType,
      criteriaBlocks: program.criteriaBlocks.map((c) => ({
        id: c.id,
        label: c.label,
        fieldType: c.fieldType,
        requiredDocumentLabel: c.requiredDocumentLabel,
      })),
      campuses,
      classes,
    },
  });
}

const submitSchema = z.object({
  fullName: z.string().min(2, "Full name is too short"),
  guardianName: z.string().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  answers: z.record(z.string(), z.string()),
  photoUrl: z.string().url().optional().or(z.literal("")),
  isZakatEligible: z.boolean().optional().default(false),
  campusId: z.string().optional().or(z.literal("")),
  classId: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest, { params }: { params: { programId: string } }) {
  const program = await prisma.scholarshipProgram.findUnique({
    where: { id: params.programId },
    include: { criteriaBlocks: true },
  });

  if (!program || !program.isActive) {
    return NextResponse.json({ error: "This scholarship program isn't accepting applications." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { fullName, guardianName, contactEmail, contactPhone, answers, photoUrl, isZakatEligible, campusId, classId } =
    parsed.data;

  const evalResult = evaluateEligibility(
    program.logicType,
    program.scoreThreshold,
    program.criteriaBlocks,
    answers
  );

  // Auto-eligibility only pre-sorts the queue — it never auto-rejects an
  // applicant outright unless the program is explicitly configured to skip
  // human review. This keeps a human in the loop by default, matching the
  // "no fixed hardcode rule" principle: institutions, not the algorithm,
  // make the final call unless they opt out of review.
  const initialStatus = program.requiresReview
    ? "SUBMITTED"
    : evalResult.qualifies
    ? "SHORTLISTED"
    : "REJECTED";

  const application = await prisma.$transaction(async (tx) => {
    const applicant = await tx.applicant.create({
      data: {
        tenantId: program.tenantId,
        fullName,
        guardianName,
        contactEmail,
        contactPhone,
        photoUrl: photoUrl || null,
        isZakatEligible,
        campusId: campusId || null,
        classId: classId || null,
        metadata: answers,
      },
    });

    const app = await tx.application.create({
      data: {
        tenantId: program.tenantId,
        programId: program.id,
        applicantId: applicant.id,
        status: initialStatus,
        eligibilityScore: evalResult.score,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: program.tenantId,
        action: "APPLICATION_SUBMITTED",
        entity: `Application:${app.id}`,
        metadata: { programId: program.id, autoQualifies: evalResult.qualifies },
      },
    });

    return app;
  });

  return NextResponse.json({ applicationId: application.id }, { status: 201 });
}

