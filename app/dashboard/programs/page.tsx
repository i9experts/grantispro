import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard-layout";
import DeleteButton from "@/components/delete-button";
import ActiveToggle from "@/components/active-toggle";
import { Plus, Award } from "lucide-react";

export default async function ProgramsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
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
    <DashboardLayout tenantName={tenant?.name} userName={session.user.name ?? undefined} role={session.user.role}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-semibold text-xl text-plum">Scholarship programs</h1>
        <Link
          href="/dashboard/programs/new"
          className="bg-plum text-ivory rounded-lg px-4 py-2 text-sm font-medium hover:bg-plum-deep transition flex items-center gap-1.5"
        >
          <Plus size={16} strokeWidth={2} />
          New program
        </Link>
      </div>

      {programs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-plum/5 flex items-center justify-center mx-auto mb-3">
            <Award size={22} className="text-plum/40" strokeWidth={1.75} />
          </div>
          <p className="text-plum/70">No scholarship programs yet.</p>
          <p className="text-sm text-plum/40 mt-1">
            Create one to start defining eligibility criteria for applicants.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {programs.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-card border border-plum/5 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-1 self-stretch rounded-full ${p.isActive ? "bg-emerald" : "bg-plum/10"}`}
                  />
                  <div>
                    <p className="font-medium text-plum">{p.name}</p>
                    <p className="text-sm text-plum/50 mt-0.5">
                      {logicLabel[p.logicType]} &middot; {p._count.criteriaBlocks} criteria &middot;{" "}
                      {p._count.applications} applications
                    </p>
                  </div>
                </div>
                <ActiveToggle programId={p.id} isActive={p.isActive} />
              </div>
              <div className="mt-3 pl-4 flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <Link href={`/dashboard/programs/${p.id}/criteria`} className="text-plum/60 hover:text-plum">
                    Edit criteria
                  </Link>
                  <Link href={`/dashboard/programs/${p.id}/applications`} className="text-plum/60 hover:text-plum">
                    View applications
                  </Link>
                  <Link href={`/apply/${p.id}`} target="_blank" className="text-emerald-dark hover:underline">
                    Public application link
                  </Link>
                  <Link href={`/invite/${p.id}`} target="_blank" className="text-marigold-dark hover:underline">
                    Invite donors
                  </Link>
                </div>
                <DeleteButton
                  endpoint={`/api/programs/${p.id}`}
                  confirmMessage={`Delete "${p.name}"? This can't be undone.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
