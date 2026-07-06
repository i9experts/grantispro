import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

const updateSchema = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "AWARDED", "REJECTED", "RENEWED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { applicationId: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to review applications" }, { status: 403 });
  }

  const application = await prisma.application.findFirst({
    where: { id: params.applicationId, tenantId: session.user.tenantId },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: { status: parsed.data.status },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: "APPLICATION_STATUS_CHANGED",
      entity: `Application:${application.id}`,
      metadata: { from: application.status, to: parsed.data.status },
    },
  });

  return NextResponse.json({ status: updated.status });
}
