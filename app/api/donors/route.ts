import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession, canManagePrograms } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

const createDonorSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["INDIVIDUAL", "CORPORATE_CSR", "GOVERNMENT_GRANT", "FOREIGN_FUNDING"]),
  contactEmail: z.string().email().optional().or(z.literal("")),
  createLogin: z.boolean().optional(),
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().min(8).optional(),
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

  const { name, type, contactEmail, createLogin, loginEmail, loginPassword } = parsed.data;

  if (createLogin) {
    if (!loginEmail || !loginPassword) {
      return NextResponse.json(
        { error: { loginEmail: ["Email and password are required to create a portal login"] } },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
    if (existing) {
      return NextResponse.json(
        { error: { loginEmail: ["An account with this email already exists"] } },
        { status: 409 }
      );
    }
  }

  const donor = await prisma.$transaction(async (tx) => {
    const created = await tx.donor.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        type,
        contactEmail: contactEmail || null,
      },
    });

    if (createLogin && loginEmail && loginPassword) {
      const passwordHash = await bcrypt.hash(loginPassword, 10);
      await tx.user.create({
        data: {
          tenantId: session.user.tenantId,
          email: loginEmail,
          passwordHash,
          name,
          role: "DONOR",
          donorId: created.id,
        },
      });
    }

    return created;
  });

  return NextResponse.json({ id: donor.id }, { status: 201 });
}
