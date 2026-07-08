import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";
import { FUND_CATEGORY_VALUES } from "@/lib/currency";

export const dynamic = "force-dynamic";

const createFundSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["GENERAL", "RESTRICTED", "DONOR_DIRECTED"]),
  category: z.enum(FUND_CATEGORY_VALUES).optional().default("GENERAL_DONATION"),
  currency: z.string().default("USD"),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const funds = await prisma.fund.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { allocations: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ funds });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to create funds" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createFundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const fund = await prisma.fund.create({
    data: { tenantId: session.user.tenantId, ...parsed.data },
  });

  return NextResponse.json({ fund }, { status: 201 });
}
