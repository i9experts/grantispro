import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to manage classes" }, { status: 403 });
  }

  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { _count: { select: { applicants: true } } },
  });
  if (!schoolClass) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (schoolClass._count.applicants > 0) {
    return NextResponse.json(
      { error: `Can't delete — ${schoolClass._count.applicants} student(s) are assigned to this class.` },
      { status: 409 }
    );
  }

  await prisma.schoolClass.delete({ where: { id: schoolClass.id } });
  return NextResponse.json({ ok: true });
}
