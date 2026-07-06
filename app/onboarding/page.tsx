"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INSTITUTION_TYPES = [
  { value: "PRIVATE", label: "Private" },
  { value: "ISLAMIC", label: "Islamic" },
  { value: "SEMI_GOVT", label: "Semi-Government" },
  { value: "GOVT_FUNDED", label: "Government-Funded" },
  { value: "WAQF", label: "Waqf" },
  { value: "TRUST", label: "Trust" },
  { value: "NGO", label: "NGO" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    institutionName: "",
    institutionType: "PRIVATE",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setServerError("");

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      if (typeof data.error === "object") {
        setErrors(data.error);
      } else {
        setServerError(data.error ?? "Something went wrong");
      }
      return;
    }

    router.push("/login?onboarded=1");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ivory px-6 py-16">
      <div className="w-full max-w-lg bg-white/60 rounded-2xl shadow-sm border border-plum/10 p-8">
        <h1 className="text-2xl font-bold text-plum">
          Set up your institution on Grantis<span className="text-marigold-dark">pro</span>
        </h1>
        <p className="mt-2 text-sm text-plum/60">
          This creates your tenant workspace and your first Institution Admin account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-plum">Institution name</label>
            <input
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={form.institutionName}
              onChange={(e) => update("institutionName", e.target.value)}
              required
            />
            {errors.institutionName && (
              <p className="text-xs text-red-600 mt-1">{errors.institutionName[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Institution type</label>
            <select
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={form.institutionType}
              onChange={(e) => update("institutionType", e.target.value)}
            >
              {INSTITUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <hr className="border-plum/10" />

          <div>
            <label className="block text-sm font-medium text-plum">Your name (Admin)</label>
            <input
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={form.adminName}
              onChange={(e) => update("adminName", e.target.value)}
              required
            />
            {errors.adminName && (
              <p className="text-xs text-red-600 mt-1">{errors.adminName[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Admin email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={form.adminEmail}
              onChange={(e) => update("adminEmail", e.target.value)}
              required
            />
            {errors.adminEmail && (
              <p className="text-xs text-red-600 mt-1">{errors.adminEmail[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={form.adminPassword}
              onChange={(e) => update("adminPassword", e.target.value)}
              minLength={8}
              required
            />
            {errors.adminPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.adminPassword[0]}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-plum text-ivory rounded-lg py-2.5 font-medium hover:bg-plum-deep transition disabled:opacity-50"
          >
            {loading ? "Creating workspace…" : "Create workspace"}
          </button>
        </form>
      </div>
    </main>
  );
}
