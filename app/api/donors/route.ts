import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

const createDonorSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["INDIVIDUAL", "CORPORATE_CSR", "GOVERNMENT_GRANT", "FOREIGN_FUNDING"]),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const donors = await prisma.donor.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      pledges: true,
      sponsorshipLinks: { include: { fund: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ donors });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to add donors" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createDonorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const donor = await prisma.donor.create({
    data: {
      tenantId: session.user.tenantId,
      name: parsed.data.name,
      type: parsed.data.type,
      contactEmail: parsed.data.contactEmail || null,
    },
  });

  return NextResponse.json({ id: donor.id }, { status: 201 });
}
