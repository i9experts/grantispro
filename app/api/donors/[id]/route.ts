import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const donor = await prisma.donor.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!donor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ donor });
}

// Deletes a donor along with their pledges, sponsorship links, and portal
// login (if one exists). Known limitation, documented rather than silently
// wrong: this does NOT retroactively decrease fund balances that were
// increased when those pledges were created — it's a records-cleanup
// operation, not a financial reversal. If a fund's balance needs correcting
// after a donor deletion, that has to be done manually for now.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to delete donors" }, { status: 403 });
  }

  const donor = await prisma.donor.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!donor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.sponsorshipLink.deleteMany({ where: { donorId: donor.id } });
    await tx.pledge.deleteMany({ where: { donorId: donor.id } });
    await tx.user.deleteMany({ where: { donorId: donor.id } });
    await tx.donor.delete({ where: { id: donor.id } });
  });

  return NextResponse.json({ ok: true });
}
