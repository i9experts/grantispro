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
        Multi-tenant scholarship &amp; donor management. Set up your
        institution, define your own eligibility criteria, and give donors
        full transparency into where their funds go.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/onboarding"
          className="bg-plum text-ivory rounded-lg px-6 py-2.5 font-medium hover:bg-plum-deep transition"
        >
          Set up your institution
        </a>
        <a
          href="/login"
          className="border border-plum/20 text-plum rounded-lg px-6 py-2.5 font-medium hover:bg-plum/5 transition"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}
