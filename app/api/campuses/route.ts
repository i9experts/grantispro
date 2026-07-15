import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campuses = await prisma.campus.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ campuses });
}

const createSchema = z.object({ name: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to manage campuses" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const campus = await prisma.campus.create({
    data: { tenantId: session.user.tenantId, name: parsed.data.name },
  });

  return NextResponse.json({ campus }, { status: 201 });
}
