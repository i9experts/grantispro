import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProgramsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const programs = await prisma.scholarshipProgram.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { criteriaBlocks: true, applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  const logicLabel: Record<string, string> = {
    ALL: "Match all criteria",
    ANY: "Match any criterion",
    SCORE: "Weighted score",
  };

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
        <Link href="/dashboard" className="text-sm text-plum/60 hover:text-plum">
          Back to dashboard
        </Link>
      </header>

      <section className="mt-10 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-plum">Scholarship programs</h2>
          <Link
            href="/dashboard/programs/new"
            className="bg-plum text-ivory rounded-lg px-4 py-2 text-sm font-medium hover:bg-plum-deep transition"
          >
            New program
          </Link>
        </div>

        {programs.length === 0 ? (
          <div className="bg-white/60 border border-plum/10 rounded-2xl p-8 text-center">
            <p className="text-plum/70">No scholarship programs yet.</p>
            <p className="text-sm text-plum/50 mt-1">
              Create one to start defining eligibility criteria for applicants.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/programs/${p.id}/criteria`}
                className="bg-white/60 border border-plum/10 rounded-xl p-5 flex items-center justify-between hover:border-plum/30 transition"
              >
                <div>
                  <p className="font-medium text-plum">{p.name}</p>
                  <p className="text-sm text-plum/60 mt-0.5">
                    {logicLabel[p.logicType]} &middot; {p._count.criteriaBlocks} criteria &middot;{" "}
                    {p._count.applications} applications
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    p.isActive
                      ? "bg-emerald/10 text-emerald-dark"
                      : "bg-plum/10 text-plum/60"
                  }`}
                >
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
