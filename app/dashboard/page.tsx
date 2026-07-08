import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard-layout";
import StatCard from "@/components/stat-card";
import Link from "next/link";
import { Award, HandCoins } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const [tenant, programCount, applicationCount, donorCount, fundAgg] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.scholarshipProgram.count({ where: { tenantId, isActive: true } }),
    prisma.application.count({ where: { tenantId } }),
    prisma.donor.count({ where: { tenantId } }),
    prisma.fund.aggregate({ where: { tenantId }, _sum: { balance: true } }),
  ]);

  const fundsTracked = Number(fundAgg._sum.balance ?? 0);

  return (
    <DashboardLayout tenantName={tenant?.name} userName={session.user.name ?? undefined} role={session.user.role}>
      <h1 className="font-display font-semibold text-xl text-plum">Welcome, {session.user.name}.</h1>
      <p className="text-plum/60 mt-1">Here&apos;s what&apos;s happening at {tenant?.name}.</p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active programs" value={programCount} />
        <StatCard label="Total applications" value={applicationCount} />
        <StatCard label="Donors" value={donorCount} />
        <StatCard label="Funds tracked" value={`$${fundsTracked.toLocaleString()}`} tone="dark" />
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/programs"
          className="bg-white rounded-2xl p-6 shadow-card border border-plum/5 hover:border-plum/20 transition flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-plum/5 flex items-center justify-center">
            <Award size={20} className="text-plum" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-medium text-plum">Scholarship programs</p>
            <p className="text-sm text-plum/50 mt-0.5">Define criteria, review applicants</p>
          </div>
        </Link>
        <Link
          href="/dashboard/donors"
          className="bg-white rounded-2xl p-6 shadow-card border border-plum/5 hover:border-plum/20 transition flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald/10 flex items-center justify-center">
            <HandCoins size={20} className="text-emerald-dark" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-medium text-plum">Funds and donors</p>
            <p className="text-sm text-plum/50 mt-0.5">Track pledges and sponsorships</p>
          </div>
        </Link>
      </div>
    </DashboardLayout>
  );
}
