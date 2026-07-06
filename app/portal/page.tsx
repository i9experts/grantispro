"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type Overview = {
  donor: { name: string; type: string };
  totalPledged: number;
  sponsorshipCount: number;
  pledges: { id: string; amount: number; currency: string; committedAt: string; receivedAt: string | null }[];
  sponsorships: {
    id: string;
    targetType: string;
    targetLabel: string;
    fundName: string;
    fundBalance: number;
    fundCurrency: string;
  }[];
};

const TARGET_VERB: Record<string, string> = {
  STUDENT: "You're directly supporting",
  CLASS: "You're supporting",
  PROJECT: "You're funding",
  INSTITUTE: "You're supporting",
  FUND: "You're contributing to",
};

export default function DonorPortalPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/overview")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-plum/60">Loading…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-plum/60">Couldn&apos;t load your dashboard.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-plum/60 hover:text-plum">
          Sign out
        </button>
      </header>

      <section className="mt-10 max-w-2xl">
        <p className="text-sm text-plum/60">Welcome back</p>
        <h2 className="text-2xl font-bold text-plum">{data.donor.name}</h2>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-plum-deep rounded-2xl p-6">
            <p className="text-xs text-white/50 mb-1">Total contributed</p>
            <p className="text-2xl font-medium text-ivory">${data.totalPledged.toLocaleString()}</p>
          </div>
          <div className="bg-white/60 border border-plum/10 rounded-2xl p-6">
            <p className="text-xs text-plum/50 mb-1">Active sponsorships</p>
            <p className="text-2xl font-medium text-plum">{data.sponsorshipCount}</p>
          </div>
        </div>

        <h3 className="mt-10 text-lg font-semibold text-plum">Your impact</h3>
        {data.sponsorships.length === 0 ? (
          <p className="mt-3 text-plum/60">No sponsorships recorded yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {data.sponsorships.map((s) => (
              <div key={s.id} className="bg-white/60 border border-plum/10 rounded-xl p-5">
                <p className="text-plum">
                  {TARGET_VERB[s.targetType]} <span className="font-medium">{s.targetLabel}</span> through{" "}
                  <span className="font-medium">{s.fundName}</span>.
                </p>
                <p className="text-sm text-plum/50 mt-2">
                  Fund balance: {s.fundCurrency} {s.fundBalance.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <h3 className="mt-10 text-lg font-semibold text-plum">Your pledges</h3>
        <div className="mt-4 flex flex-col gap-2">
          {data.pledges.map((p) => (
            <div key={p.id} className="bg-white/60 border border-plum/10 rounded-xl p-4 flex justify-between">
              <p className="text-plum">
                {p.currency} {p.amount.toLocaleString()}
              </p>
              <p className="text-sm text-plum/50">
                {p.receivedAt ? "Received" : "Committed"} &middot;{" "}
                {new Date(p.committedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
