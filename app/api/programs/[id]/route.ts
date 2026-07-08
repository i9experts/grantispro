import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.scholarshipProgram.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { criteriaBlocks: { orderBy: { createdAt: "asc" } } },
  });

  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ program });
}

const updateProgramSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  logicType: z.enum(["ALL", "ANY", "SCORE"]).optional(),
  scoreThreshold: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
  requiresReview: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to edit programs" }, { status: 403 });
  }

  const program = await prisma.scholarshipProgram.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateProgramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updated = await prisma.scholarshipProgram.update({
    where: { id: program.id },
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: "PROGRAM_UPDATED",
      entity: `ScholarshipProgram:${program.id}`,
      metadata: parsed.data,
    },
  });

  return NextResponse.json({ program: updated });
}

// Deletes a program along with its criteria blocks. Refuses if any
// applications already reference it — deleting those would destroy real
// applicant history, so this is a deliberate guardrail, not an oversight.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to delete programs" }, { status: 403 });
  }

  const program = await prisma.scholarshipProgram.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { _count: { select: { applications: true } } },
  });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (program._count.applications > 0) {
    return NextResponse.json(
      {
        error: `Can't delete — ${program._count.applications} application(s) exist for this program. Set it to Inactive instead, or contact support to archive it with its history intact.`,
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.criteriaBlock.deleteMany({ where: { programId: program.id } });
    await tx.scholarshipProgram.delete({ where: { id: program.id } });
  });

  return NextResponse.json({ ok: true });
}
