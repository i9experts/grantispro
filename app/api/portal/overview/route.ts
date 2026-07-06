import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";

export const dynamic = "force-dynamic";

// Privacy default: donors see a student's first name and last initial only,
// never full name or other PII, unless a future consent flag says otherwise.
// This is a deliberate choice — the original PRD flagged "student PII
// visibility to donors" as an open question; this is the conservative
// default until an institution explicitly configures something else.
function safeStudentName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "DONOR" || !session.user.donorId) {
    return NextResponse.json({ error: "This view is only available to donor accounts" }, { status: 403 });
  }

  const donor = await prisma.donor.findUnique({
    where: { id: session.user.donorId },
    include: {
      pledges: { orderBy: { committedAt: "desc" } },
      sponsorshipLinks: { include: { fund: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!donor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const studentIds = donor.sponsorshipLinks
    .filter((l) => l.targetType === "STUDENT" && l.targetId)
    .map((l) => l.targetId as string);

  const applicants = studentIds.length
    ? await prisma.applicant.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const nameById = Object.fromEntries(applicants.map((a) => [a.id, safeStudentName(a.fullName)]));

  const totalPledged = donor.pledges.reduce((sum, p) => sum + Number(p.amount), 0);

  return NextResponse.json({
    donor: { name: donor.name, type: donor.type },
    totalPledged,
    sponsorshipCount: donor.sponsorshipLinks.length,
    pledges: donor.pledges.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      committedAt: p.committedAt,
      receivedAt: p.receivedAt,
    })),
    sponsorships: donor.sponsorshipLinks.map((l) => ({
      id: l.id,
      targetType: l.targetType,
      targetLabel:
        l.targetType === "STUDENT" && l.targetId
          ? nameById[l.targetId] ?? "A sponsored student"
          : l.targetType === "CLASS"
          ? l.targetId
          : l.targetType === "PROJECT"
          ? l.targetId
          : l.targetType === "INSTITUTE"
          ? "The whole institution"
          : "General fund",
      fundName: l.fund.name,
      fundBalance: Number(l.fund.balance),
      fundCurrency: l.fund.currency,
    })),
  });
}
