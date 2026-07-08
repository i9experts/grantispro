import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard-layout";
import StatCard from "@/components/stat-card";
import { Wallet } from "lucide-react";
import { formatCurrency, fundCategoryLabel } from "@/lib/currency";

export default async function FundsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
  const funds = await prisma.fund.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { allocations: true } } },
    orderBy: { createdAt: "desc" },
  });

  const typeLabel: Record<string, string> = {
    GENERAL: "General",
    RESTRICTED: "Restricted",
    DONOR_DIRECTED: "Donor-directed",
  };

  const totalBalance = funds.reduce((sum, f) => sum + Number(f.balance), 0);

  return (
    <DashboardLayout tenantName={tenant?.name} userName={session.user.name ?? undefined} role={session.user.role}>
      <h1 className="font-display font-semibold text-xl text-plum mb-6">Funds</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total funds" value={funds.length} />
        <StatCard
          label="Sponsorship links"
          value={funds.reduce((sum, f) => sum + f._count.allocations, 0)}
        />
        <StatCard label="Total balance" value={formatCurrency(totalBalance, tenant?.defaultCurrency)} tone="dark" />
      </div>

      {funds.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-plum/5 flex items-center justify-center mx-auto mb-3">
            <Wallet size={22} className="text-plum/40" strokeWidth={1.75} />
          </div>
          <p className="text-plum/70">No funds yet.</p>
          <p className="text-sm text-plum/40 mt-1">
            Funds are created automatically the first time you add a donor sponsorship, or you
            can add one from the donor flow.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {funds.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-2xl shadow-card border border-plum/5 p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald/10 flex items-center justify-center shrink-0">
                  <Wallet size={17} className="text-emerald-dark" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-medium text-plum">{f.name}</p>
                  <p className="text-sm text-plum/50 mt-0.5">
                    {typeLabel[f.type]} &middot; {fundCategoryLabel(f.category)} &middot; {f._count.allocations} sponsorship link
                    {f._count.allocations === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <p className="text-lg font-display font-semibold text-plum">
                {f.currency} {Number(f.balance).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
