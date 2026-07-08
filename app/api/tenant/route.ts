import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    tenant: {
      name: tenant.name,
      institutionType: tenant.institutionType,
      defaultCurrency: tenant.defaultCurrency,
      logoUrl: tenant.logoUrl,
    },
  });
}

const updateSchema = z.object({
  defaultCurrency: z.string().min(3).max(3).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "INSTITUTION_ADMIN") {
    return NextResponse.json({ error: "Only an institution admin can change settings" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: parsed.data,
  });

  return NextResponse.json({ tenant: { defaultCurrency: tenant.defaultCurrency, logoUrl: tenant.logoUrl } });
}
