import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public endpoint — no auth. This is the page an institution shares with
// prospective donors: program details, plain-English criteria, and
// transparency stats (how many students already supported, how much
// raised so far for this specific program).
export async function GET(_req: NextRequest, { params }: { params: { programId: string } }) {
  const program = await prisma.scholarshipProgram.findUnique({
    where: { id: params.programId },
    include: {
      criteriaBlocks: { orderBy: { createdAt: "asc" } },
      tenant: {
        select: {
          name: true,
          logoUrl: true,
          institutionType: true,
          defaultCurrency: true,
          bankName: true,
          bankAccountTitle: true,
          bankAccountNumber: true,
          bankIban: true,
        },
      },
      applications: { where: { status: "AWARDED" }, select: { id: true } },
    },
  });

  if (!program || !program.isActive) {
    return NextResponse.json({ error: "This scholarship program isn't available for sponsorship right now." }, { status: 404 });
  }

  const pledges = await prisma.pledge.findMany({ where: { programId: program.id } });
  const raisedByCurrency: Record<string, number> = {};
  for (const p of pledges) {
    raisedByCurrency[p.currency] = (raisedByCurrency[p.currency] ?? 0) + Number(p.amount);
  }

  return NextResponse.json({
    program: {
      id: program.id,
      name: program.name,
      description: program.description,
      logicType: program.logicType,
      criteriaBlocks: program.criteriaBlocks.map((c) => ({
        label: c.label,
        fieldType: c.fieldType,
        operator: c.operator,
        value: c.value,
      })),
    },
    tenant: program.tenant,
    stats: {
      studentsSupported: program.applications.length,
      raisedByCurrency,
      pledgeCount: pledges.length,
    },
  });
}

const OPS_LABEL: Record<string, string> = {
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  eq: "equals",
  contains: "contains",
  in: "is one of",
};

const pledgeSchema = z.object({
  donorName: z.string().min(2),
  donorType: z.enum(["INDIVIDUAL", "CORPORATE_CSR", "GOVERNMENT_GRANT", "FOREIGN_FUNDING"]),
  donorEmail: z.string().email(),
  donorPhone: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  category: z.enum([
    "ZAKAT",
    "SADAQAH",
    "SADAQAH_JARIYAH",
    "FITRANA",
    "WAQF",
    "QURBANI",
    "GENERAL_DONATION",
    "CORPORATE_CSR",
    "GOVERNMENT_GRANT",
    "OTHER",
  ]),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "YEARLY"]),
  paymentMethod: z.enum(["CASH", "BANK_DEPOSIT", "CHEQUE", "BANK_TRANSFER", "ONLINE"]),
  deliveryPreference: z.enum(["DONOR_SENDS", "SCHOOL_COLLECTS"]),
  donorNote: z.string().optional(),
  wantsPortalLogin: z.boolean().optional().default(false),
  portalPassword: z.string().min(8).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { programId: string } }) {
  const program = await prisma.scholarshipProgram.findUnique({ where: { id: params.programId } });
  if (!program || !program.isActive) {
    return NextResponse.json({ error: "This scholarship program isn't available for sponsorship right now." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = pledgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    donorName,
    donorType,
    donorEmail,
    donorPhone,
    amount,
    currency,
    category,
    frequency,
    paymentMethod,
    deliveryPreference,
    donorNote,
    wantsPortalLogin,
    portalPassword,
  } = parsed.data;

  if (wantsPortalLogin && !portalPassword) {
    return NextResponse.json(
      { error: { portalPassword: ["A password is required to create a portal login"] } },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Match an existing donor by email within this tenant, or create a new one.
    let donor = await tx.donor.findFirst({
      where: { tenantId: program.tenantId, contactEmail: donorEmail },
    });
    if (!donor) {
      donor = await tx.donor.create({
        data: {
          tenantId: program.tenantId,
          name: donorName,
          type: donorType,
          contactEmail: donorEmail,
        },
      });
    }

    const pledge = await tx.pledge.create({
      data: {
        donorId: donor.id,
        programId: program.id,
        amount,
        currency,
        category,
        frequency,
        paymentMethod,
        deliveryPreference,
        donorNote: donorNote || null,
      },
    });

    let portalCreated = false;
    if (wantsPortalLogin && portalPassword) {
      const existingUser = await tx.user.findUnique({ where: { email: donorEmail } });
      if (!existingUser) {
        const passwordHash = await bcrypt.hash(portalPassword, 10);
        await tx.user.create({
          data: {
            tenantId: program.tenantId,
            email: donorEmail,
            passwordHash,
            name: donorName,
            role: "DONOR",
            donorId: donor.id,
          },
        });
        portalCreated = true;
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId: program.tenantId,
        action: "PUBLIC_PLEDGE_SUBMITTED",
        entity: `Pledge:${pledge.id}`,
        metadata: { programId: program.id, amount, paymentMethod, frequency },
      },
    });

    return { pledgeId: pledge.id, portalCreated };
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: program.tenantId },
    select: { name: true, bankName: true, bankAccountTitle: true, bankAccountNumber: true, bankIban: true },
  });

  return NextResponse.json({ ...result, tenant }, { status: 201 });
}
