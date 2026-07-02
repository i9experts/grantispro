export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold text-plum">
        Grantis<span className="text-marigold-dark">pro</span>
      </h1>
      <p className="mt-4 text-sm tracking-widest uppercase text-plum/60">
        Scholarships &middot; Sponsors &middot; Transparency
      </p>
      <p className="mt-10 max-w-md text-plum/70">
        Multi-tenant scholarship &amp; donor management is under construction.
        This scaffold is ready for tenant onboarding, the criteria engine,
        and the donor transparency dashboard.
      </p>
    </main>
  );
}
