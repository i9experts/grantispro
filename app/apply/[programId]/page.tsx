"use client";

import { useEffect, useState } from "react";

type CriteriaField = {
  id: string;
  label: string;
  fieldType: "NUMBER" | "TEXT" | "BOOLEAN" | "SELECT";
  requiredDocumentLabel: string | null;
};

type ProgramInfo = {
  id: string;
  name: string;
  description: string | null;
  tenantName: string;
  institutionType: string;
  criteriaBlocks: CriteriaField[];
};

export default function ApplyPage({ params }: { params: { programId: string } }) {
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isZakatEligible, setIsZakatEligible] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    setPhotoError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setPhotoUploading(false);

    if (!res.ok) {
      const data = await res.json();
      setPhotoError(data.error ?? "Upload failed");
      return;
    }

    const data = await res.json();
    setPhotoUrl(data.url);
  }

  useEffect(() => {
    fetch(`/api/apply/${params.programId}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setProgram(data.program);
      })
      .finally(() => setLoading(false));
  }, [params.programId]);

  const requiredDocuments = Array.from(
    new Set(
      (program?.criteriaBlocks ?? [])
        .map((c) => c.requiredDocumentLabel)
        .filter((d): d is string => Boolean(d))
    )
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const res = await fetch(`/api/apply/${params.programId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, guardianName, contactEmail, contactPhone, answers, photoUrl, isZakatEligible }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      if (typeof data.error === "object") setErrors(data.error);
      return;
    }

    setSubmitted(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-plum/60">Loading…</p>
      </main>
    );
  }

  if (notFound || !program) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-plum">Application unavailable</h1>
          <p className="mt-2 text-plum/60">
            This scholarship program isn&apos;t currently accepting applications.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-white/60 border border-plum/10 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-plum">Application submitted</h1>
          <p className="mt-2 text-plum/70">
            Thank you for applying to {program.name}. {program.tenantName} will review your
            application and contact you at {contactEmail} with an update.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory px-6 py-12">
      <div className="max-w-xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-plum/50">{program.tenantName}</p>
        <h1 className="text-2xl font-bold text-plum mt-1">{program.name}</h1>
        {program.description && <p className="mt-2 text-plum/70">{program.description}</p>}

        <form onSubmit={handleSubmit} className="mt-8 bg-white/60 border border-plum/10 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-plum">Full name</label>
            <input
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Guardian name (if applicable)</label>
            <input
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
            {errors.contactEmail && <p className="text-xs text-red-600 mt-1">{errors.contactEmail[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Phone</label>
            <input
              className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-plum">Your photo (optional)</label>
            <p className="text-xs text-plum/50 mb-2">
              Sponsors like to see who they&apos;re supporting — a recent photo helps.
            </p>
            <div className="flex items-center gap-4">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border border-plum/20"
                />
              )}
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm" />
            </div>
            {photoUploading && <p className="text-xs text-plum/50 mt-1">Uploading…</p>}
            {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
          </div>

          {program.criteriaBlocks.length > 0 && (
            <>
              <hr className="border-plum/10" />
              <p className="text-sm font-medium text-plum">Eligibility questions</p>
              {program.criteriaBlocks.map((c) => (
                <div key={c.id}>
                  <label className="block text-sm text-plum">{c.label}</label>
                  {c.fieldType === "BOOLEAN" ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
                      value={answers[c.id] ?? ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [c.id]: e.target.value }))}
                      required
                    >
                      <option value="" disabled>
                        Select an answer
                      </option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      type={c.fieldType === "NUMBER" ? "number" : "text"}
                      className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald"
                      value={answers[c.id] ?? ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [c.id]: e.target.value }))}
                      required
                    />
                  )}
                </div>
              ))}
            </>
          )}

          {(program.institutionType === "ISLAMIC" || program.institutionType === "WAQF") && (
            <>
              <hr className="border-plum/10" />
              <label className="flex items-start gap-2 text-sm text-plum">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={isZakatEligible}
                  onChange={(e) => setIsZakatEligible(e.target.checked)}
                />
                <span>
                  I am a Muslim and eligible to receive Zakat
                  <span className="block text-xs text-plum/50 mt-0.5">
                    Only relevant if you&apos;re applying for Zakat-funded support. Leave unchecked
                    if unsure or not applicable.
                  </span>
                </span>
              </label>
            </>
          )}

          {requiredDocuments.length > 0 && (
            <>
              <hr className="border-plum/10" />
              <div className="bg-marigold/10 rounded-lg p-4">
                <p className="text-sm font-medium text-plum">Documents you&apos;ll need to provide</p>
                <ul className="mt-2 text-sm text-plum/70 list-disc list-inside">
                  {requiredDocuments.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <p className="text-xs text-plum/50 mt-2">
                  Document upload isn&apos;t available yet — {program.tenantName} will contact you
                  separately to collect these.
                </p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting || photoUploading}
            className="w-full bg-plum text-ivory rounded-lg py-2.5 font-medium hover:bg-plum-deep transition disabled:opacity-50"
          >
            {submitting ? "Submitting…" : photoUploading ? "Uploading photo…" : "Submit application"}
          </button>
        </form>
      </div>
    </main>
  );
}
