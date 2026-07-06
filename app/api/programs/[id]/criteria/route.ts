import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

const criteriaBlockSchema = z.object({
  label: z.string().min(1),
  fieldType: z.enum(["NUMBER", "TEXT", "BOOLEAN", "SELECT"]),
  operator: z.string().min(1),
  value: z.string(),
  weight: z.number().int().min(0).default(1),
  requiredDocumentLabel: z.string().optional().nullable(),
});

const saveCriteriaSchema = z.object({
  criteria: z.array(criteriaBlockSchema),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to edit criteria" }, { status: 403 });
  }

  const program = await prisma.scholarshipProgram.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = saveCriteriaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { criteria } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.criteriaBlock.deleteMany({ where: { programId: program.id } });
    if (criteria.length > 0) {
      await tx.criteriaBlock.createMany({
        data: criteria.map((c) => ({ ...c, programId: program.id })),
      });
    }
    await tx.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        actorId: session.user.id,
        action: "CRITERIA_UPDATED",
        entity: `ScholarshipProgram:${program.id}`,
        metadata: { criteriaCount: criteria.length },
      },
    });
  });

  return NextResponse.json({ ok: true, count: criteria.length });
}
