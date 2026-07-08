import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";
import { FUND_CATEGORY_VALUES } from "@/lib/currency";

const sponsorSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  category: z.enum(FUND_CATEGORY_VALUES).optional().default("GENERAL_DONATION"),
  fundId: z.string().optional(),
  newFund: z
    .object({
      name: z.string().min(2),
      type: z.enum(["GENERAL", "RESTRICTED", "DONOR_DIRECTED"]),
      category: z.enum(FUND_CATEGORY_VALUES).optional().default("GENERAL_DONATION"),
    })
    .optional(),
  targetType: z.enum(["STUDENT", "CLASS", "INSTITUTE", "PROJECT", "FUND"]),
  targetId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePrograms(session.user.role)) {
    return NextResponse.json({ error: "You don't have permission to record sponsorships" }, { status: 403 });
  }

  const donor = await prisma.donor.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!donor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = sponsorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { amount, currency, category, fundId, newFund, targetType, targetId } = parsed.data;

  if (!fundId && !newFund) {
    return NextResponse.json({ error: { fundId: ["Choose an existing fund or create a new one"] } }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let fund;
    if (newFund) {
      fund = await tx.fund.create({
        data: { tenantId: session.user.tenantId, name: newFund.name, type: newFund.type, category: newFund.category, currency },
      });
    } else {
      fund = await tx.fund.findFirst({ where: { id: fundId, tenantId: session.user.tenantId } });
      if (!fund) throw new Error("Fund not found");
    }

    const pledge = await tx.pledge.create({
      data: { donorId: donor.id, amount, currency, category },
    });

    const link = await tx.sponsorshipLink.create({
      data: {
        donorId: donor.id,
        fundId: fund.id,
        targetType,
        targetId: targetType === "FUND" || targetType === "INSTITUTE" ? null : targetId,
      },
    });

    // Simplification for this milestone: fund balance reflects committed
    // pledges immediately, not confirmed bank receipt. A "mark as received"
    // reconciliation step (using Pledge.receivedAt) is future work.
    await tx.fund.update({
      where: { id: fund.id },
      data: { balance: { increment: amount } },
    });

    await tx.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        actorId: session.user.id,
        action: "SPONSORSHIP_LINKED",
        entity: `SponsorshipLink:${link.id}`,
        metadata: { donorId: donor.id, fundId: fund.id, amount, targetType },
      },
    });

    return { fundId: fund.id, pledgeId: pledge.id, linkId: link.id };
  });

  return NextResponse.json(result, { status: 201 });
}
