import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to delete funds" }, { status: 403 });
  }

  const fund = await prisma.fund.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { _count: { select: { allocations: true, awards: true, disbursements: true } } },
  });
  if (!fund) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalRefs = fund._count.allocations + fund._count.awards + fund._count.disbursements;
  if (totalRefs > 0) {
    return NextResponse.json(
      {
        error: `Can't delete — this fund has ${fund._count.allocations} sponsorship link(s) and ${fund._count.awards} grant(s) tied to it. Remove those first, or leave the fund as a historical record.`,
      },
      { status: 409 }
    );
  }

  await prisma.fund.delete({ where: { id: fund.id } });
  return NextResponse.json({ ok: true });
}
