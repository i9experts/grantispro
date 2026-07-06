"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LOGIC_OPTIONS = [
  { value: "ALL", title: "Match all", desc: "Applicant must meet every criterion" },
  { value: "ANY", title: "Match any", desc: "Applicant must meet one criterion" },
  { value: "SCORE", title: "Weighted score", desc: "Criteria add up to a threshold" },
];

export default function NewProgramPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logicType, setLogicType] = useState("ALL");
  const [scoreThreshold, setScoreThreshold] = useState(10);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        logicType,
        scoreThreshold: logicType === "SCORE" ? scoreThreshold : null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      if (typeof data.error === "object") setErrors(data.error);
      return;
    }

    const data = await res.json();
    router.push(`/dashboard/programs/${data.id}/criteria`);
  }

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header>
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
      </header>

      <section className="mt-10 max-w-xl">
        <h2 className="text-lg font-semibold text-plum">New scholarship program</h2>
        <p className="text-sm text-plum/60 mt-1">
          Step 1 of 2 &middot; Program basics
        </p>

        <form onSubmit={handleSubmit} className="mt-6 bg-white/60 border border-plum/10 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-plum">Program name</label>
            <input
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Description</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-plum mb-2">Eligibility logic</label>
            <div className="grid grid-cols-3 gap-2">
              {LOGIC_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setLogicType(opt.value)}
                  className={`text-left rounded-lg p-3 border-2 transition ${
                    logicType === opt.value ? "border-plum" : "border-plum/10"
                  }`}
                >
                  <p className="text-sm font-medium text-plum">{opt.title}</p>
                  <p className="text-xs text-plum/60 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {logicType === "SCORE" && (
            <div>
              <label className="block text-sm font-medium text-plum">
                Score threshold to qualify
              </label>
              <input
                type="number"
                className="mt-1 w-32 rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(Number(e.target.value))}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-plum text-ivory rounded-lg py-2.5 font-medium hover:bg-plum-deep transition disabled:opacity-50"
          >
            {loading ? "Creating…" : "Next: define criteria"}
          </button>
        </form>
      </section>
    </main>
  );
}
