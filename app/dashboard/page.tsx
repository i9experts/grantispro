import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
        <span className="text-sm text-plum/60">
          {session.user.role} · {tenant?.name}
        </span>
      </header>

      <section className="mt-12 max-w-2xl">
        <h2 className="text-lg font-semibold text-plum">Welcome, {session.user.name}.</h2>
        <p className="mt-2 text-plum/70">
          Your tenant workspace ({tenant?.name}) is live.
        </p>
        <a
          href="/dashboard/programs"
          className="inline-block mt-6 bg-plum text-ivory rounded-lg px-5 py-2.5 font-medium hover:bg-plum-deep transition"
        >
          Scholarship programs
        </a>
        <a
          href="/dashboard/donors"
          className="inline-block mt-6 ml-3 border border-plum/20 text-plum rounded-lg px-5 py-2.5 font-medium hover:bg-plum/5 transition"
        >
          Funds and donors
        </a>
      </section>
    </main>
  );
}
