import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to manage campuses" }, { status: 403 });
  }

  const campus = await prisma.campus.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { _count: { select: { applicants: true } } },
  });
  if (!campus) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (campus._count.applicants > 0) {
    return NextResponse.json(
      { error: `Can't delete — ${campus._count.applicants} student(s) are assigned to this campus.` },
      { status: 409 }
    );
  }

  await prisma.campus.delete({ where: { id: campus.id } });
  return NextResponse.json({ ok: true });
}
