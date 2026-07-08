import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });

  return NextResponse.json({
    name: session.user.name,
    role: session.user.role,
    tenantName: tenant?.name,
    defaultCurrency: tenant?.defaultCurrency ?? "USD",
  });
}
