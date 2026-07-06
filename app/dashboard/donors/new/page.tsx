"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DONOR_TYPES = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "CORPORATE_CSR", label: "Corporate CSR" },
  { value: "GOVERNMENT_GRANT", label: "Government grant" },
  { value: "FOREIGN_FUNDING", label: "Foreign funding" },
];

export default function NewDonorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("INDIVIDUAL");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const res = await fetch("/api/donors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, contactEmail }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      if (typeof data.error === "object") setErrors(data.error);
      return;
    }

    const data = await res.json();
    router.push(`/dashboard/donors/${data.id}/sponsor`);
  }

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header>
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
      </header>

      <section className="mt-10 max-w-xl">
        <h2 className="text-lg font-semibold text-plum">Add donor</h2>
        <p className="text-sm text-plum/60 mt-1">Step 1 of 2 &middot; Donor details</p>

        <form onSubmit={handleSubmit} className="mt-6 bg-white/60 border border-plum/10 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-plum">Donor name</label>
            <input
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Contact email (optional)</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-plum mb-2">Donor type</label>
            <div className="grid grid-cols-4 gap-2">
              {DONOR_TYPES.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`text-center rounded-lg p-3 border-2 transition text-xs font-medium text-plum ${
                    type === opt.value ? "border-plum" : "border-plum/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-plum text-ivory rounded-lg py-2.5 font-medium hover:bg-plum-deep transition disabled:opacity-50"
          >
            {loading ? "Adding…" : "Next: record pledge"}
          </button>
        </form>
      </section>
    </main>
  );
}
