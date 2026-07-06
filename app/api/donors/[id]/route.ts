import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const donor = await prisma.donor.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!donor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ donor });
}
