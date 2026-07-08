import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applicants = await prisma.applicant.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, fullName: true, photoUrl: true },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ applicants });
}

const createApplicantSchema = z.object({
  fullName: z.string().min(2),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

// Lets staff add a student directly (e.g. an already-enrolled student being
// granted a scholarship administratively), separate from the public
// application intake flow.
export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to add students" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const applicant = await prisma.applicant.create({
    data: {
      tenantId: session.user.tenantId,
      fullName: parsed.data.fullName,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone || null,
    },
  });

  return NextResponse.json({ id: applicant.id, fullName: applicant.fullName }, { status: 201 });
}
