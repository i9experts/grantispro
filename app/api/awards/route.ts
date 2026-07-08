import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

const createAwardSchema = z.object({
  applicantId: z.string(),
  scholarshipName: z.string().min(2),
  awardType: z.enum(["FULL", "PARTIAL_PERCENT", "FIXED_AMOUNT"]),
  percentValue: z.number().int().min(1).max(100).optional(),
  amount: z.number().nonnegative(),
  currency: z.string().default("USD"),
  fundId: z.string().optional(),
  newFund: z
    .object({ name: z.string().min(2), type: z.enum(["GENERAL", "RESTRICTED", "DONOR_DIRECTED"]) })
    .optional(),
  reason: z.string().optional(),
  startDate: z.string(), // ISO date string
  durationMonths: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const awards = await prisma.award.findMany({
    where: { fund: { tenantId: session.user.tenantId } },
    include: { applicant: true, application: { include: { applicant: true } }, fund: true },
    orderBy: { awardedAt: "desc" },
  });

  return NextResponse.json({
    awards: awards.map((a) => ({
      id: a.id,
      scholarshipName: a.scholarshipName,
      awardType: a.awardType,
      percentValue: a.percentValue,
      amount: Number(a.amount),
      currency: a.currency,
      reason: a.reason,
      startDate: a.startDate,
      durationMonths: a.durationMonths,
      studentName: a.applicant?.fullName ?? a.application?.applicant.fullName ?? "Unknown",
      fundName: a.fund.name,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to grant scholarships" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createAwardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    applicantId,
    scholarshipName,
    awardType,
    percentValue,
    amount,
    currency,
    fundId,
    newFund,
    reason,
    startDate,
    durationMonths,
  } = parsed.data;

  if (!fundId && !newFund) {
    return NextResponse.json({ error: { fundId: ["Choose an existing fund or create a new one"] } }, { status: 400 });
  }

  const applicant = await prisma.applicant.findFirst({
    where: { id: applicantId, tenantId: session.user.tenantId },
  });
  if (!applicant) return NextResponse.json({ error: { applicantId: ["Student not found"] } }, { status: 404 });

  const award = await prisma.$transaction(async (tx) => {
    let fund;
    if (newFund) {
      fund = await tx.fund.create({
        data: { tenantId: session.user.tenantId, name: newFund.name, type: newFund.type, currency },
      });
    } else {
      fund = await tx.fund.findFirst({ where: { id: fundId, tenantId: session.user.tenantId } });
      if (!fund) throw new Error("Fund not found");
    }

    const created = await tx.award.create({
      data: {
        applicantId,
        fundId: fund.id,
        scholarshipName,
        awardType,
        percentValue: awardType === "PARTIAL_PERCENT" ? percentValue : null,
        amount,
        currency,
        reason: reason || null,
        startDate: new Date(startDate),
        durationMonths: durationMonths ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        actorId: session.user.id,
        action: "SCHOLARSHIP_GRANTED",
        entity: `Award:${created.id}`,
        metadata: { applicantId, scholarshipName, awardType, amount },
      },
    });

    return created;
  });

  return NextResponse.json({ id: award.id }, { status: 201 });
}
