import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  institutionName: z.string().min(2, "Institution name is too short"),
  institutionType: z.enum([
    "PRIVATE",
    "ISLAMIC",
    "SEMI_GOVT",
    "GOVT_FUNDED",
    "WAQF",
    "TRUST",
    "NGO",
  ]),
  adminName: z.string().min(2, "Admin name is too short"),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { institutionName, institutionType, adminName, adminEmail, adminPassword } =
    parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) {
    return NextResponse.json(
      { error: { adminEmail: ["An account with this email already exists"] } },
      { status: 409 }
    );
  }

  // Ensure a unique slug (append a short suffix on collision)
  let slug = slugify(institutionName);
  const collision = await prisma.tenant.findUnique({ where: { slug } });
  if (collision) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const tenant = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: {
        name: institutionName,
        slug,
        institutionType,
      },
    });

    await tx.user.create({
      data: {
        tenantId: newTenant.id,
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "INSTITUTION_ADMIN",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: newTenant.id,
        action: "TENANT_CREATED",
        entity: `Tenant:${newTenant.id}`,
        metadata: { institutionType },
      },
    });

    return newTenant;
  });

  return NextResponse.json({ tenantId: tenant.id, slug: tenant.slug }, { status: 201 });
}
