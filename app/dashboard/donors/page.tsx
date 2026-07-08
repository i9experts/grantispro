import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard-layout";
import StatCard from "@/components/stat-card";
import { Plus, User, Building2, Landmark, Globe } from "lucide-react";

const TYPE_ICON: Record<string, any> = {
  INDIVIDUAL: User,
  CORPORATE_CSR: Building2,
  GOVERNMENT_GRANT: Landmark,
  FOREIGN_FUNDING: Globe,
};

export default async function DonorsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
  const donors = await prisma.donor.findMany({
    where: { tenantId: session.user.tenantId },
    include: { pledges: true, sponsorshipLinks: { include: { fund: true } } },
    orderBy: { createdAt: "desc" },
  });

  const typeLabel: Record<string, string> = {
    INDIVIDUAL: "Individual",
    CORPORATE_CSR: "Corporate CSR",
    GOVERNMENT_GRANT: "Government grant",
    FOREIGN_FUNDING: "Foreign funding",
  };

  const totalDonors = donors.length;
  const activeSponsorships = donors.reduce((sum, d) => sum + d.sponsorshipLinks.length, 0);
  const studentsSponsored = new Set(
    donors.flatMap((d) => d.sponsorshipLinks.filter((l) => l.targetType === "STUDENT").map((l) => l.targetId))
  ).size;
  const totalPledged = donors.reduce(
    (sum, d) => sum + d.pledges.reduce((s, p) => s + Number(p.amount), 0),
    0
  );

  return (
    <DashboardLayout tenantName={tenant?.name} userName={session.user.name ?? undefined} role={session.user.role}>
      <h1 className="font-display font-semibold text-xl text-plum mb-6">Donors</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total donors" value={totalDonors} />
        <StatCard label="Active sponsorships" value={activeSponsorships} />
        <StatCard label="Students sponsored" value={studentsSponsored} />
        <StatCard label="Total pledged" value={`$${totalPledged.toLocaleString()}`} tone="dark" />
      </div>

      <div className="flex justify-end mb-4">
        <Link
          href="/dashboard/donors/new"
          className="bg-plum text-ivory rounded-lg px-4 py-2 text-sm font-medium hover:bg-plum-deep transition flex items-center gap-1.5"
        >
          <Plus size={16} strokeWidth={2} />
          Add donor
        </Link>
      </div>

      {donors.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-10 text-center">
          <p className="text-plum/70">No donors yet.</p>
          <p className="text-sm text-plum/40 mt-1">Add a donor to start recording pledges and sponsorships.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {donors.map((d) => {
            const totalPledgedByDonor = d.pledges.reduce((sum, p) => sum + Number(p.amount), 0);
            const Icon = TYPE_ICON[d.type] ?? User;
            return (
              <div key={d.id} className="bg-white rounded-2xl shadow-card border border-plum/5 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-plum/5 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-plum/60" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="font-medium text-plum">{d.name}</p>
                      <p className="text-sm text-plum/50 mt-0.5">
                        {typeLabel[d.type]} &middot; {d.sponsorshipLinks.length} sponsorship
                        {d.sponsorshipLinks.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-display font-semibold text-plum">
                    ${totalPledgedByDonor.toLocaleString()}
                  </p>
                </div>
                {d.sponsorshipLinks.length > 0 && (
                  <div className="mt-3 pl-[3.25rem] pt-3 border-t border-plum/5 flex flex-col gap-1">
                    {d.sponsorshipLinks.map((link) => (
                      <p key={link.id} className="text-sm text-plum/60">
                        {link.targetType === "STUDENT" && "Sponsoring a student via "}
                        {link.targetType === "CLASS" && "Sponsoring a class via "}
                        {link.targetType === "INSTITUTE" && "Sponsoring the institute via "}
                        {link.targetType === "PROJECT" && "Sponsoring a project via "}
                        {link.targetType === "FUND" && "Contributing to "}
                        <span className="text-plum">{link.fund.name}</span>
                      </p>
                    ))}
                  </div>
                )}
                <Link
                  href={`/dashboard/donors/${d.id}/sponsor`}
                  className="inline-block mt-3 pl-[3.25rem] text-sm text-emerald-dark hover:underline"
                >
                  Add another pledge
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
