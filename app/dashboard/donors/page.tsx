import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DonorsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

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

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard/funds" className="text-plum/60 hover:text-plum">
            Funds
          </Link>
          <Link href="/dashboard" className="text-plum/60 hover:text-plum">
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="mt-10 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-plum">Donors</h2>
          <Link
            href="/dashboard/donors/new"
            className="bg-plum text-ivory rounded-lg px-4 py-2 text-sm font-medium hover:bg-plum-deep transition"
          >
            Add donor
          </Link>
        </div>

        {donors.length === 0 ? (
          <div className="bg-white/60 border border-plum/10 rounded-2xl p-8 text-center">
            <p className="text-plum/70">No donors yet.</p>
            <p className="text-sm text-plum/50 mt-1">
              Add a donor to start recording pledges and sponsorships.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {donors.map((d) => {
              const totalPledged = d.pledges.reduce((sum, p) => sum + Number(p.amount), 0);
              return (
                <div key={d.id} className="bg-white/60 border border-plum/10 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-plum">{d.name}</p>
                      <p className="text-sm text-plum/60 mt-0.5">
                        {typeLabel[d.type]} &middot; {d.sponsorshipLinks.length} sponsorship
                        {d.sponsorshipLinks.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-lg font-medium text-plum">
                      ${totalPledged.toLocaleString()}
                    </p>
                  </div>
                  {d.sponsorshipLinks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-plum/10 flex flex-col gap-1">
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
                    className="inline-block mt-3 text-sm text-emerald-dark hover:underline"
                  >
                    Add another pledge
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
