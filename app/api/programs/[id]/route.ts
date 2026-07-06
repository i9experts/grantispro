import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.scholarshipProgram.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { criteriaBlocks: { orderBy: { createdAt: "asc" } } },
  });

  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ program });
}
