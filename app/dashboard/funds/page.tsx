import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function FundsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

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

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard/donors" className="text-plum/60 hover:text-plum">
            Donors
          </Link>
          <Link href="/dashboard" className="text-plum/60 hover:text-plum">
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold text-plum mb-6">Funds</h2>

        {funds.length === 0 ? (
          <div className="bg-white/60 border border-plum/10 rounded-2xl p-8 text-center">
            <p className="text-plum/70">No funds yet.</p>
            <p className="text-sm text-plum/50 mt-1">
              Funds are created automatically the first time you add a donor sponsorship,
              or you can add one from the donor flow.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {funds.map((f) => (
              <div key={f.id} className="bg-white/60 border border-plum/10 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-plum">{f.name}</p>
                  <p className="text-sm text-plum/60 mt-0.5">
                    {typeLabel[f.type]} &middot; {f._count.allocations} sponsorship link
                    {f._count.allocations === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="text-lg font-medium text-plum">
                  {f.currency} {Number(f.balance).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
