"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard-layout";
import { GraduationCap, Trophy, PieChart, Wallet as WalletIcon } from "lucide-react";

type Applicant = { id: string; fullName: string; photoUrl: string | null };
type Fund = { id: string; name: string; type: string; balance: number; currency: string };

const AWARD_TYPES = [
  { value: "FULL", label: "Full Scholarship", desc: "100% fee waiver — student pays nothing", icon: Trophy },
  { value: "PARTIAL_PERCENT", label: "Partial %", desc: "e.g. 50% discount on fee", icon: PieChart },
  { value: "FIXED_AMOUNT", label: "Fixed Amount Waiver", desc: "e.g. a fixed sum off every term", icon: WalletIcon },
];

const REASONS = ["Need-based", "Merit-based", "Sibling discount", "Staff child", "Other"];

export default function GrantScholarshipPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState<string | undefined>();
  const [userName, setUserName] = useState<string | undefined>();
  const [role, setRole] = useState<string | undefined>();

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [applicantId, setApplicantId] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");

  const [scholarshipName, setScholarshipName] = useState("");
  const [awardType, setAwardType] = useState("FULL");
  const [percentValue, setPercentValue] = useState(50);
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [fundId, setFundId] = useState<string | null>(null);
  const [creatingFund, setCreatingFund] = useState(false);
  const [newFundName, setNewFundName] = useState("");
  const [newFundType, setNewFundType] = useState("GENERAL");
  const [reason, setReason] = useState("Need-based");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationMonths, setDurationMonths] = useState<number | "">("");

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const [meRes, applicantsRes, fundsRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/applicants"),
        fetch("/api/funds"),
      ]);
      if (meRes.ok) {
        const me = await meRes.json();
        setTenantName(me.tenantName);
        setUserName(me.name);
        setRole(me.role);
      }
      if (applicantsRes.ok) {
        const { applicants } = await applicantsRes.json();
        setApplicants(applicants);
        if (applicants.length > 0) setApplicantId(applicants[0].id);
        else setAddingStudent(true);
      }
      if (fundsRes.ok) {
        const { funds } = await fundsRes.json();
        setFunds(funds);
        if (funds.length > 0) setFundId(funds[0].id);
        else setCreatingFund(true);
      }
    }
    load();
  }, []);

  async function handleAddStudent() {
    if (!newStudentName.trim()) return;
    const res = await fetch("/api/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: newStudentName }),
    });
    if (res.ok) {
      const data = await res.json();
      setApplicants((a) => [...a, { id: data.id, fullName: data.fullName, photoUrl: null }]);
      setApplicantId(data.id);
      setAddingStudent(false);
      setNewStudentName("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const body: any = {
      applicantId,
      scholarshipName,
      awardType,
      percentValue: awardType === "PARTIAL_PERCENT" ? percentValue : undefined,
      amount,
      currency,
      reason,
      startDate: new Date(startDate).toISOString(),
      durationMonths: durationMonths === "" ? null : Number(durationMonths),
    };
    if (creatingFund) body.newFund = { name: newFundName, type: newFundType };
    else body.fundId = fundId;

    const res = await fetch("/api/awards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      if (typeof data.error === "object") setErrors(data.error);
      return;
    }

    router.push("/dashboard/grants");
  }

  return (
    <DashboardLayout tenantName={tenantName} userName={userName} role={role}>
      <div className="max-w-xl">
        <p className="text-xs uppercase tracking-widest text-marigold-dark font-medium">Grant Scholarship</p>
        <h1 className="font-display font-semibold text-2xl text-plum mt-1">Grant Scholarship / Waiver</h1>

        <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl shadow-card border border-plum/5 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-plum mb-1">Student</label>
            {addingStudent ? (
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-plum/20 px-3 py-2"
                  placeholder="Student full name"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddStudent}
                  className="bg-plum text-ivory rounded-lg px-4 text-sm font-medium"
                >
                  Add
                </button>
                {applicants.length > 0 && (
                  <button type="button" onClick={() => setAddingStudent(false)} className="text-sm text-plum/50">
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-lg border border-plum/20 px-3 py-2"
                  value={applicantId}
                  onChange={(e) => setApplicantId(e.target.value)}
                >
                  {applicants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddingStudent(true)}
                  className="text-sm text-emerald-dark whitespace-nowrap"
                >
                  + New student
                </button>
              </div>
            )}
            {errors.applicantId && <p className="text-xs text-red-600 mt-1">{errors.applicantId[0]}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-plum mb-1">Scholarship name</label>
            <input
              className="w-full rounded-lg border border-plum/20 px-3 py-2"
              placeholder="e.g. Merit Scholarship 2026"
              value={scholarshipName}
              onChange={(e) => setScholarshipName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-plum mb-2">Scholarship type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AWARD_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setAwardType(t.value)}
                    className={`text-center rounded-xl p-4 border-2 transition ${
                      awardType === t.value ? "border-plum bg-plum/5" : "border-plum/10"
                    }`}
                  >
                    <Icon size={22} className="text-plum mx-auto mb-2" strokeWidth={1.75} />
                    <p className="text-sm font-medium text-plum">{t.label}</p>
                    <p className="text-xs text-plum/50 mt-1">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {awardType === "PARTIAL_PERCENT" && (
              <div>
                <label className="block text-sm font-medium text-plum mb-1">Discount %</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="w-full rounded-lg border border-plum/20 px-3 py-2"
                  value={percentValue}
                  onChange={(e) => setPercentValue(Number(e.target.value))}
                />
              </div>
            )}
            <div className={awardType === "PARTIAL_PERCENT" ? "" : "col-span-2"}>
              <label className="block text-sm font-medium text-plum mb-1">
                {awardType === "FIXED_AMOUNT" ? "Fixed amount" : "Fee value (informational)"}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="flex-1 rounded-lg border border-plum/20 px-3 py-2"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <select
                  className="rounded-lg border border-plum/20 px-2"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-plum mb-2">Fund</label>
            <div className="flex flex-col gap-2">
              {funds.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => {
                    setFundId(f.id);
                    setCreatingFund(false);
                  }}
                  className={`text-left flex items-center justify-between rounded-lg p-2.5 border-2 transition text-sm ${
                    fundId === f.id && !creatingFund ? "border-plum" : "border-plum/10"
                  }`}
                >
                  <span className="text-plum">{f.name}</span>
                  <span className="text-plum/50">
                    {f.currency} {Number(f.balance).toLocaleString()}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCreatingFund(true)}
                className={`text-left rounded-lg p-2.5 border-2 border-dashed text-sm text-plum/60 ${
                  creatingFund ? "border-plum" : "border-plum/20"
                }`}
              >
                + Create new fund
              </button>
            </div>
            {creatingFund && (
              <div className="mt-2 flex gap-2">
                <input
                  placeholder="Fund name"
                  className="flex-1 rounded-lg border border-plum/20 px-3 py-2 text-sm"
                  value={newFundName}
                  onChange={(e) => setNewFundName(e.target.value)}
                />
                <select
                  className="rounded-lg border border-plum/20 px-2 text-sm"
                  value={newFundType}
                  onChange={(e) => setNewFundType(e.target.value)}
                >
                  <option value="GENERAL">General</option>
                  <option value="RESTRICTED">Restricted</option>
                  <option value="DONOR_DIRECTED">Donor-directed</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-plum mb-1">Reason</label>
              <select
                className="w-full rounded-lg border border-plum/20 px-3 py-2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-plum mb-1">Start date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-plum/20 px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-plum mb-1">
              Duration in months (leave blank for ongoing)
            </label>
            <input
              type="number"
              className="w-40 rounded-lg border border-plum/20 px-3 py-2"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !applicantId}
            className="w-full bg-plum text-ivory rounded-lg py-2.5 font-medium hover:bg-plum-deep transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <GraduationCap size={18} strokeWidth={1.75} />
            {submitting ? "Granting…" : "Grant Scholarship"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
