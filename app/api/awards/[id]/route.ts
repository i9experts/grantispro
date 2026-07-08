import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to delete grants" }, { status: 403 });
  }

  const award = await prisma.award.findFirst({
    where: { id: params.id, fund: { tenantId: session.user.tenantId } },
  });
  if (!award) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.disbursement.deleteMany({ where: { awardId: award.id } });
    await tx.award.delete({ where: { id: award.id } });
  });

  return NextResponse.json({ ok: true });
}
