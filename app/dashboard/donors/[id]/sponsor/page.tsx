"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FUND_CATEGORIES } from "@/lib/currency";

type Fund = { id: string; name: string; type: string; balance: string | number; currency: string };
type Applicant = { id: string; fullName: string };

const TARGET_TYPES = [
  { value: "STUDENT", label: "Student" },
  { value: "CLASS", label: "Class" },
  { value: "INSTITUTE", label: "Institute" },
  { value: "PROJECT", label: "Project" },
  { value: "FUND", label: "Fund only" },
];

export default function SponsorWizardPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [donorName, setDonorName] = useState("");
  const [funds, setFunds] = useState<Fund[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  const [amount, setAmount] = useState(5000);
  const [currency, setCurrency] = useState("USD");
  const [fundId, setFundId] = useState<string | null>(null);
  const [creatingFund, setCreatingFund] = useState(false);
  const [newFundName, setNewFundName] = useState("");
  const [newFundType, setNewFundType] = useState("GENERAL");
  const [newFundCategory, setNewFundCategory] = useState("GENERAL_DONATION");
  const [pledgeCategory, setPledgeCategory] = useState("GENERAL_DONATION");

  const [targetType, setTargetType] = useState("STUDENT");
  const [targetId, setTargetId] = useState("");
  const [targetText, setTargetText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [donorRes, fundsRes, applicantsRes] = await Promise.all([
        fetch(`/api/donors/${params.id}`),
        fetch("/api/funds"),
        fetch("/api/applicants"),
      ]);
      if (donorRes.ok) setDonorName((await donorRes.json()).donor.name);
      if (fundsRes.ok) {
        const { funds } = await fundsRes.json();
        setFunds(funds);
        if (funds.length > 0) setFundId(funds[0].id);
        else setCreatingFund(true);
      }
      if (applicantsRes.ok) {
        const { applicants } = await applicantsRes.json();
        setApplicants(applicants);
        if (applicants.length > 0) setTargetId(applicants[0].id);
      }
    }
    load();
  }, [params.id]);

  const selectedFund = funds.find((f) => f.id === fundId);

  function targetLabel() {
    if (targetType === "STUDENT") {
      const a = applicants.find((x) => x.id === targetId);
      return a ? a.fullName : "a student";
    }
    if (targetType === "CLASS") return targetText || "a class";
    if (targetType === "PROJECT") return targetText || "a project";
    if (targetType === "INSTITUTE") return "the whole institution";
    return "the fund's general balance";
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    const body: any = {
      amount,
      currency,
      category: pledgeCategory,
      targetType,
      targetId:
        targetType === "STUDENT"
          ? targetId
          : targetType === "CLASS" || targetType === "PROJECT"
          ? targetText
          : undefined,
    };
    if (creatingFund) {
      body.newFund = { name: newFundName, type: newFundType, category: newFundCategory };
    } else {
      body.fundId = fundId;
    }

    const res = await fetch(`/api/donors/${params.id}/sponsor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Something went wrong. Check the form and try again.");
      return;
    }

    router.push("/dashboard/donors");
  }

  return (
    <main className="min-h-screen bg-ivory px-8 py-10">
      <header>
        <h1 className="text-2xl font-bold text-plum">
          Grantis<span className="text-marigold-dark">pro</span>
        </h1>
      </header>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-lg font-semibold text-plum">{donorName || "Donor"}</h2>
        <p className="text-sm text-plum/60 mt-1">Step {step + 1} of 4 &middot; Record pledge and sponsorship</p>

        {step === 1 && (
          <div className="mt-6 bg-white/60 border border-plum/10 rounded-2xl p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-plum">Pledge amount</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-plum">Currency</label>
                <select
                  className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="PKR">PKR</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-plum">Donation category</label>
              <select
                className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2"
                value={pledgeCategory}
                onChange={(e) => setPledgeCategory(e.target.value)}
              >
                {FUND_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.group}: {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-plum mb-2">Contribute to fund</label>
              <div className="flex flex-col gap-2">
                {funds.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => {
                      setFundId(f.id);
                      setCreatingFund(false);
                    }}
                    className={`text-left flex items-center justify-between rounded-lg p-3 border-2 transition ${
                      fundId === f.id && !creatingFund ? "border-plum" : "border-plum/10"
                    }`}
                  >
                    <div>
                      <p className="text-sm text-plum">{f.name}</p>
                      <p className="text-xs text-plum/50">{f.type.replace("_", " ").toLowerCase()}</p>
                    </div>
                    <p className="text-sm text-plum/60">
                      {f.currency} {Number(f.balance).toLocaleString()}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCreatingFund(true)}
                  className={`text-left rounded-lg p-3 border-2 border-dashed transition text-sm text-plum/70 ${
                    creatingFund ? "border-plum" : "border-plum/20"
                  }`}
                >
                  + Create new fund
                </button>
              </div>
              {creatingFund && (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      placeholder="Fund name"
                      className="flex-1 rounded-lg border border-plum/20 px-3 py-2 text-sm"
                      value={newFundName}
                      onChange={(e) => setNewFundName(e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-plum/20 px-3 py-2 text-sm"
                      value={newFundType}
                      onChange={(e) => setNewFundType(e.target.value)}
                    >
                      <option value="GENERAL">General</option>
                      <option value="RESTRICTED">Restricted</option>
                      <option value="DONOR_DIRECTED">Donor-directed</option>
                    </select>
                  </div>
                  <select
                    className="rounded-lg border border-plum/20 px-3 py-2 text-sm"
                    value={newFundCategory}
                    onChange={(e) => setNewFundCategory(e.target.value)}
                  >
                    {FUND_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.group}: {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={creatingFund ? !newFundName : !fundId}
              className="w-full bg-plum text-ivory rounded-lg py-2.5 font-medium hover:bg-plum-deep transition disabled:opacity-50"
            >
              Next: sponsorship target
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 bg-white/60 border border-plum/10 rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-plum mb-2">
                What is this contribution sponsoring?
              </label>
              <div className="grid grid-cols-5 gap-2">
                {TARGET_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setTargetType(t.value)}
                    className={`text-center rounded-lg p-2.5 border-2 transition text-xs font-medium text-plum ${
                      targetType === t.value ? "border-plum" : "border-plum/10"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {targetType === "STUDENT" && (
              <div>
                <label className="block text-sm font-medium text-plum">Select student</label>
                {applicants.length === 0 ? (
                  <p className="text-sm text-plum/50 mt-1">No applicants yet in this tenant.</p>
                ) : (
                  <select
                    className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  >
                    {applicants.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fullName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {(targetType === "CLASS" || targetType === "PROJECT") && (
              <div>
                <label className="block text-sm font-medium text-plum">
                  {targetType === "CLASS" ? "Class or cohort name" : "Project name"}
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-plum/20 px-3 py-2"
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  placeholder={targetType === "CLASS" ? "e.g. Grade 10 - Section A" : "e.g. STEM Lab Renovation"}
                />
              </div>
            )}

            {targetType === "INSTITUTE" && (
              <p className="text-sm text-plum/60">
                This contribution supports the whole institution, not a specific student, class,
                or project.
              </p>
            )}
            {targetType === "FUND" && (
              <p className="text-sm text-plum/60">
                This contribution goes into the fund&apos;s general balance with no specific target.
              </p>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-plum/60 text-sm">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-plum text-ivory rounded-lg px-6 py-2.5 font-medium hover:bg-plum-deep transition"
              >
                Next: review
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-5">
            <div className="bg-white/60 border border-plum/10 rounded-2xl p-6">
              <p className="text-xs text-plum/50 mb-2">Internal summary</p>
              <p className="text-sm text-plum">
                {donorName} pledges {currency} {amount.toLocaleString()} to{" "}
                {creatingFund ? newFundName : selectedFund?.name}, directed toward{" "}
                {targetLabel()}.
              </p>
            </div>

            <div className="bg-plum-deep rounded-2xl p-6">
              <p className="text-xs text-white/50 mb-1">Your contribution</p>
              <p className="text-2xl font-medium text-ivory mb-3">
                {currency} {amount.toLocaleString()}
              </p>
              <p className="text-sm text-white/70">
                {targetType === "STUDENT" && `You're directly supporting ${targetLabel()}'s education.`}
                {targetType === "CLASS" && `You're supporting ${targetLabel()}.`}
                {targetType === "PROJECT" && `You're funding "${targetLabel()}".`}
                {targetType === "INSTITUTE" && "You're supporting the institution as a whole."}
                {targetType === "FUND" && "Your contribution adds to the fund's general balance."}
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="text-plum/60 text-sm">
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="bg-emerald text-emerald-dark rounded-lg px-6 py-2.5 font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Confirm sponsorship link"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
