import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

const createProgramSchema = z.object({
  name: z.string().min(2, "Program name is too short"),
  description: z.string().optional(),
  logicType: z.enum(["ALL", "ANY", "SCORE"]),
  scoreThreshold: z.number().int().optional().nullable(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const programs = await prisma.scholarshipProgram.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { criteriaBlocks: true, applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ programs });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to create programs" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createProgramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { name, description, logicType, scoreThreshold } = parsed.data;

  const program = await prisma.scholarshipProgram.create({
    data: {
      tenantId: session.user.tenantId,
      name,
      description,
      logicType,
      scoreThreshold: logicType === "SCORE" ? scoreThreshold ?? 10 : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: "PROGRAM_CREATED",
      entity: `ScholarshipProgram:${program.id}`,
      metadata: { name, logicType },
    },
  });

  return NextResponse.json({ id: program.id }, { status: 201 });
}
