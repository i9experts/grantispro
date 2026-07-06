"use client";

import { useEffect, useState } from "react";

type Application = {
  id: string;
  status: string;
  eligibilityScore: number | null;
  submittedAt: string;
  applicant: {
    fullName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    metadata: Record<string, string> | null;
  };
};

const STATUS_OPTIONS = ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "AWARDED", "REJECTED", "RENEWED"];

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-plum/10 text-plum/60",
  UNDER_REVIEW: "bg-marigold/10 text-marigold-dark",
  SHORTLISTED: "bg-emerald/10 text-emerald-dark",
  AWARDED: "bg-emerald/20 text-emerald-dark",
  REJECTED: "bg-red-100 text-red-700",
  RENEWED: "bg-emerald/10 text-emerald-dark",
};

export default function ApplicationsReviewPage({ params }: { params: { id: string } }) {
  const [programName, setProgramName] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(`/api/programs/${params.id}/applications`);
    if (res.ok) {
      const data = await res.json();
      setProgramName(data.program.name);
      setApplications(data.applications);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function updateStatus(id: string, status: string) {
    setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, status } : a)));
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory px-8 py-10">
        <p className="text-plum/60">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header>
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
      </header>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold text-plum">{programName} &middot; Applications</h2>
        <p className="text-sm text-plum/60 mt-1">
          Sorted by eligibility score. Score reflects the criteria engine's automatic
          evaluation — final decisions are yours.
        </p>

        {applications.length === 0 ? (
          <div className="mt-6 bg-white/60 border border-plum/10 rounded-2xl p-8 text-center">
            <p className="text-plum/70">No applications yet.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {applications.map((a) => (
              <div key={a.id} className="bg-white/60 border border-plum/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="text-left flex-1"
                  >
                    <p className="font-medium text-plum">{a.applicant.fullName}</p>
                    <p className="text-sm text-plum/60 mt-0.5">
                      {a.applicant.contactEmail} &middot; Score: {a.eligibilityScore ?? 0}
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[a.status]}`}>
                      {a.status.replace("_", " ")}
                    </span>
                    <select
                      className="text-sm rounded-lg border border-plum/20 px-2 py-1.5"
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {expanded === a.id && a.applicant.metadata && (
                  <div className="mt-3 pt-3 border-t border-plum/10 text-sm text-plum/70 space-y-1">
                    <p>Phone: {a.applicant.contactPhone || "—"}</p>
                    <p>Submitted: {new Date(a.submittedAt).toLocaleDateString()}</p>
                    <p className="font-medium text-plum mt-2">Answers</p>
                    {Object.entries(a.applicant.metadata).map(([k, v]) => (
                      <p key={k}>
                        {k}: {String(v)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
