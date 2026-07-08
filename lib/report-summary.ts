import { prisma } from "@/lib/prisma";

export async function buildReportSummary(tenantId: string) {
  const [tenant, awards, applications, programs, donors, pledges, funds, zakatEligibleCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.award.findMany({ where: { fund: { tenantId } } }),
    prisma.application.findMany({ where: { tenantId }, select: { status: true, eligibilityScore: true } }),
    prisma.scholarshipProgram.findMany({
      where: { tenantId },
      select: { id: true, name: true, isActive: true, _count: { select: { applications: true } } },
    }),
    prisma.donor.findMany({ where: { tenantId }, select: { type: true } }),
    prisma.pledge.findMany({ where: { donor: { tenantId } } }),
    prisma.fund.findMany({ where: { tenantId } }),
    prisma.applicant.count({ where: { tenantId, isZakatEligible: true } }),
  ]);

  const awardsByType: Record<string, number> = {};
  const awardTotalByCurrency: Record<string, number> = {};
  for (const a of awards) {
    awardsByType[a.awardType] = (awardsByType[a.awardType] ?? 0) + 1;
    awardTotalByCurrency[a.currency] = (awardTotalByCurrency[a.currency] ?? 0) + Number(a.amount);
  }

  const awardsByReason: Record<string, number> = {};
  for (const a of awards) {
    const r = a.reason ?? "Not specified";
    awardsByReason[r] = (awardsByReason[r] ?? 0) + 1;
  }

  const applicationsByStatus: Record<string, number> = {};
  let scoreSum = 0;
  let scoreCount = 0;
  for (const app of applications) {
    applicationsByStatus[app.status] = (applicationsByStatus[app.status] ?? 0) + 1;
    if (app.eligibilityScore !== null) {
      scoreSum += app.eligibilityScore;
      scoreCount += 1;
    }
  }

  const donorsByType: Record<string, number> = {};
  for (const d of donors) {
    donorsByType[d.type] = (donorsByType[d.type] ?? 0) + 1;
  }

  const pledgeTotalByCurrency: Record<string, number> = {};
  const pledgesByCategory: Record<string, number> = {};
  let pledgesReceived = 0;
  let pledgesCommittedOnly = 0;
  for (const p of pledges) {
    pledgeTotalByCurrency[p.currency] = (pledgeTotalByCurrency[p.currency] ?? 0) + Number(p.amount);
    pledgesByCategory[p.category] = (pledgesByCategory[p.category] ?? 0) + Number(p.amount);
    if (p.receivedAt) pledgesReceived += 1;
    else pledgesCommittedOnly += 1;
  }

  const fundsByCategory: Record<string, number> = {};
  for (const f of funds) {
    fundsByCategory[f.category] = (fundsByCategory[f.category] ?? 0) + Number(f.balance);
  }

  return {
    tenantName: tenant?.name,
    defaultCurrency: tenant?.defaultCurrency ?? "USD",
    generatedAt: new Date().toISOString(),
    scholarships: {
      totalGranted: awards.length,
      byType: awardsByType,
      byReason: awardsByReason,
      totalByCurrency: awardTotalByCurrency,
    },
    applications: {
      total: applications.length,
      byStatus: applicationsByStatus,
      averageScore: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null,
    },
    programs: {
      total: programs.length,
      active: programs.filter((p) => p.isActive).length,
      list: programs.map((p) => ({ name: p.name, isActive: p.isActive, applications: p._count.applications })),
    },
    donors: { total: donors.length, byType: donorsByType },
    pledges: {
      total: pledges.length,
      received: pledgesReceived,
      committedOnly: pledgesCommittedOnly,
      totalByCurrency: pledgeTotalByCurrency,
      byCategory: pledgesByCategory,
    },
    funds: {
      total: funds.length,
      byCategory: fundsByCategory,
      list: funds.map((f) => ({ name: f.name, category: f.category, balance: Number(f.balance), currency: f.currency })),
    },
    zakat: { eligibleApplicants: zakatEligibleCount },
  };
}
