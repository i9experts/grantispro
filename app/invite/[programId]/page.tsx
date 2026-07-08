"use client";

import { useEffect, useState } from "react";
import { Heart, Building2, Landmark, Globe, User, Check } from "lucide-react";

type CriteriaDisplay = { label: string; fieldType: string; operator: string; value: string };

type InviteData = {
  program: { id: string; name: string; description: string | null; logicType: string; criteriaBlocks: CriteriaDisplay[] };
  tenant: {
    name: string;
    logoUrl: string | null;
    institutionType: string;
    defaultCurrency: string;
    bankName: string | null;
    bankAccountTitle: string | null;
    bankAccountNumber: string | null;
    bankIban: string | null;
  };
  stats: { studentsSupported: number; raisedByCurrency: Record<string, number>; pledgeCount: number };
};

const OPS_LABEL: Record<string, string> = {
  lt: "under",
  lte: "at most",
  gt: "over",
  gte: "at least",
  eq: "",
  contains: "including",
  in: "one of",
};

const DONOR_TYPES = [
  { value: "INDIVIDUAL", label: "Individual", icon: User },
  { value: "CORPORATE_CSR", label: "Corporate CSR", icon: Building2 },
  { value: "GOVERNMENT_GRANT", label: "Government", icon: Landmark },
  { value: "FOREIGN_FUNDING", label: "Foreign / NGO", icon: Globe },
];

const FREQUENCIES = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_DEPOSIT", label: "Bank deposit" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "ONLINE", label: "Online payment" },
];

const CATEGORY_OPTIONS = [
  { value: "ZAKAT", label: "Zakat", group: "Islamic" },
  { value: "SADAQAH", label: "Sadaqah", group: "Islamic" },
  { value: "SADAQAH_JARIYAH", label: "Sadaqah Jariyah (ongoing)", group: "Islamic" },
  { value: "FITRANA", label: "Fitrana", group: "Islamic" },
  { value: "WAQF", label: "Waqf", group: "Islamic" },
  { value: "QURBANI", label: "Qurbani", group: "Islamic" },
  { value: "GENERAL_DONATION", label: "General donation", group: "General" },
  { value: "CORPORATE_CSR", label: "Corporate CSR", group: "General" },
  { value: "GOVERNMENT_GRANT", label: "Government grant", group: "General" },
  { value: "OTHER", label: "Other", group: "General" },
];

function criteriaToSentence(c: CriteriaDisplay): string {
  const opWord = OPS_LABEL[c.operator] ?? c.operator;
  return opWord ? `${c.label} ${opWord} ${c.value}` : `${c.label}: ${c.value}`;
}

export default function InvitePage({ params }: { params: { programId: string } }) {
  const [data, setData] = useState<InviteData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [donorName, setDonorName] = useState("");
  const [donorType, setDonorType] = useState("INDIVIDUAL");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [amount, setAmount] = useState(5000);
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("GENERAL_DONATION");
  const [frequency, setFrequency] = useState("ONE_TIME");
  const [paymentMethod, setPaymentMethod] = useState("BANK_DEPOSIT");
  const [deliveryPreference, setDeliveryPreference] = useState("DONOR_SENDS");
  const [donorNote, setDonorNote] = useState("");
  const [wantsPortalLogin, setWantsPortalLogin] = useState(true);
  const [portalPassword, setPortalPassword] = useState("");

  useEffect(() => {
    fetch(`/api/invite/${params.programId}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        setData(json);
        setCurrency(json.tenant.defaultCurrency ?? "USD");
      })
      .finally(() => setLoading(false));
  }, [params.programId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const res = await fetch(`/api/invite/${params.programId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donorName,
        donorType,
        donorEmail,
        donorPhone,
        amount,
        currency,
        category,
        frequency,
        paymentMethod,
        deliveryPreference,
        donorNote,
        wantsPortalLogin,
        portalPassword: wantsPortalLogin ? portalPassword : undefined,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      if (typeof data.error === "object") setErrors(data.error);
      return;
    }

    setConfirmation(await res.json());
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-plum/60">Loading…</p>
      </main>
    );
  }

  if (notFound || !data) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center px-6">
        <p className="text-plum/60">This scholarship program isn&apos;t available for sponsorship right now.</p>
      </main>
    );
  }

  if (confirmation) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center px-6 py-16">
        <div className="max-w-lg bg-white rounded-2xl shadow-card border border-plum/5 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald/10 flex items-center justify-center mx-auto mb-4">
            <Check size={26} className="text-emerald-dark" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold text-plum">Thank you for your pledge</h1>
          <p className="mt-2 text-plum/70">
            {data.tenant.name} has recorded your commitment and will follow up at {donorEmail}.
          </p>

          {paymentMethod === "BANK_DEPOSIT" || paymentMethod === "BANK_TRANSFER" ? (
            <div className="mt-6 bg-plum/5 rounded-xl p-4 text-left">
              <p className="text-sm font-medium text-plum mb-2">Bank details</p>
              {confirmation.tenant?.bankName ? (
                <div className="text-sm text-plum/80 space-y-1">
                  <p>Bank: {confirmation.tenant.bankName}</p>
                  <p>Account title: {confirmation.tenant.bankAccountTitle}</p>
                  <p>Account number: {confirmation.tenant.bankAccountNumber}</p>
                  {confirmation.tenant.bankIban && <p>IBAN: {confirmation.tenant.bankIban}</p>}
                </div>
              ) : (
                <p className="text-sm text-plum/60">
                  {data.tenant.name} hasn&apos;t added bank details yet — they&apos;ll send them to you directly.
                </p>
              )}
            </div>
          ) : deliveryPreference === "SCHOOL_COLLECTS" ? (
            <div className="mt-6 bg-plum/5 rounded-xl p-4 text-left">
              <p className="text-sm text-plum/80">
                Our team will contact you within a couple of business days to arrange collection.
              </p>
            </div>
          ) : (
            <div className="mt-6 bg-plum/5 rounded-xl p-4 text-left">
              <p className="text-sm text-plum/80">
                Please deliver your {paymentMethod === "CHEQUE" ? "cheque" : "contribution"} to {data.tenant.name}, or
                await further instructions by email.
              </p>
            </div>
          )}

          {confirmation.portalCreated && (
            <p className="mt-4 text-sm text-emerald-dark">
              Your donor portal account is ready — sign in anytime to track your impact.
            </p>
          )}
        </div>
      </main>
    );
  }

  const totalRaised = Object.entries(data.stats.raisedByCurrency);

  return (
    <main className="min-h-screen bg-ivory">
      <div className="bg-plum-deep px-6 py-14">
        <div className="max-w-2xl mx-auto text-center">
          {data.tenant.logoUrl && (
            <img src={data.tenant.logoUrl} alt="" className="w-14 h-14 rounded-lg object-contain bg-white mx-auto mb-4" />
          )}
          <p className="text-xs uppercase tracking-widest text-marigold">{data.tenant.name}</p>
          <h1 className="text-3xl font-bold text-ivory mt-2">{data.program.name}</h1>
          {data.program.description && <p className="mt-3 text-white/70 max-w-lg mx-auto">{data.program.description}</p>}

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-2xl font-display font-semibold text-ivory">{data.stats.studentsSupported}</p>
              <p className="text-xs text-white/60 mt-0.5">Students supported</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-2xl font-display font-semibold text-ivory">{data.stats.pledgeCount}</p>
              <p className="text-xs text-white/60 mt-0.5">Pledges so far</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-lg font-display font-semibold text-ivory">
                {totalRaised.length > 0 ? totalRaised.map(([c, a]) => `${c} ${a.toLocaleString()}`).join(", ") : "—"}
              </p>
              <p className="text-xs text-white/60 mt-0.5">Raised for this program</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8">
        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-6">
          <div className="flex items-start gap-3">
            <Heart size={18} className="text-marigold-dark mt-0.5 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-plum">Full transparency, always</p>
              <p className="text-sm text-plum/60 mt-1">
                Every pledge is tracked against this program. If you create a donor portal login
                below, you can log in anytime to see exactly which students and funds your
                contribution supports.
              </p>
            </div>
          </div>

          {data.program.criteriaBlocks.length > 0 && (
            <div className="mt-5 pt-5 border-t border-plum/5">
              <p className="text-sm font-medium text-plum mb-2">Who this supports</p>
              <ul className="text-sm text-plum/70 list-disc list-inside space-y-1">
                {data.program.criteriaBlocks.map((c, i) => (
                  <li key={i}>{criteriaToSentence(c)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl shadow-card border border-plum/5 p-6 space-y-6">
          <div>
            <p className="text-sm font-medium text-plum mb-2">Your details</p>
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-plum/20 px-3 py-2"
                placeholder="Full name"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  className="w-full rounded-lg border border-plum/20 px-3 py-2"
                  placeholder="Email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  required
                />
                <input
                  className="w-full rounded-lg border border-plum/20 px-3 py-2"
                  placeholder="Phone (optional)"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {DONOR_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setDonorType(t.value)}
                      className={`text-center rounded-lg p-2 border-2 text-xs transition ${
                        donorType === t.value ? "border-plum text-plum" : "border-plum/10 text-plum/50"
                      }`}
                    >
                      <Icon size={16} className="mx-auto mb-1" strokeWidth={1.75} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-plum mb-2">Your gift</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="number"
                className="col-span-2 rounded-lg border border-plum/20 px-3 py-2"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <select
                className="rounded-lg border border-plum/20 px-2 py-2"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
              </select>
            </div>
            <select
              className="w-full rounded-lg border border-plum/20 px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.group}: {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-plum mb-2">How often</p>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  type="button"
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`text-center rounded-lg p-2 border-2 text-xs font-medium transition ${
                    frequency === f.value ? "border-plum text-plum" : "border-plum/10 text-plum/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-plum mb-2">Payment method</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`text-center rounded-lg p-2 border-2 text-xs font-medium transition ${
                    paymentMethod === m.value ? "border-plum text-plum" : "border-plum/10 text-plum/50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {(paymentMethod === "BANK_DEPOSIT" || paymentMethod === "BANK_TRANSFER") && (
              <div className="mt-3 bg-emerald/5 rounded-lg p-3 text-sm text-plum/70">
                {data.tenant.bankName ? (
                  <>
                    <p>Bank: {data.tenant.bankName}</p>
                    <p>Account title: {data.tenant.bankAccountTitle}</p>
                    <p>Account number: {data.tenant.bankAccountNumber}</p>
                    {data.tenant.bankIban && <p>IBAN: {data.tenant.bankIban}</p>}
                  </>
                ) : (
                  <p>Bank details will be sent to you by email after you submit this pledge.</p>
                )}
              </div>
            )}
            {paymentMethod === "ONLINE" && (
              <p className="mt-3 text-sm text-plum/50 bg-marigold/10 rounded-lg p-3">
                Online payment isn&apos;t set up yet — {data.tenant.name} will follow up with
                alternative options.
              </p>
            )}

            {(paymentMethod === "CASH" || paymentMethod === "CHEQUE") && (
              <div className="mt-3">
                <p className="text-sm text-plum mb-2">How will this reach {data.tenant.name}?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryPreference("DONOR_SENDS")}
                    className={`text-center rounded-lg p-2 border-2 text-xs font-medium transition ${
                      deliveryPreference === "DONOR_SENDS" ? "border-plum text-plum" : "border-plum/10 text-plum/50"
                    }`}
                  >
                    I&apos;ll deliver it myself
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryPreference("SCHOOL_COLLECTS")}
                    className={`text-center rounded-lg p-2 border-2 text-xs font-medium transition ${
                      deliveryPreference === "SCHOOL_COLLECTS" ? "border-plum text-plum" : "border-plum/10 text-plum/50"
                    }`}
                  >
                    Please arrange collection
                  </button>
                </div>
                {deliveryPreference === "SCHOOL_COLLECTS" && (
                  <input
                    className="w-full rounded-lg border border-plum/20 px-3 py-2 mt-2 text-sm"
                    placeholder="Address / best time to reach you"
                    value={donorNote}
                    onChange={(e) => setDonorNote(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          <div className="border-t border-plum/10 pt-4">
            <label className="flex items-start gap-2 text-sm text-plum">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={wantsPortalLogin}
                onChange={(e) => setWantsPortalLogin(e.target.checked)}
              />
              <span>
                Create a donor portal login for me
                <span className="block text-xs text-plum/50 mt-0.5">
                  Track exactly which students and funds your contributions support, anytime.
                </span>
              </span>
            </label>
            {wantsPortalLogin && (
              <input
                type="password"
                className="w-full rounded-lg border border-plum/20 px-3 py-2 mt-2 text-sm"
                placeholder="Choose a password (min. 8 characters)"
                value={portalPassword}
                onChange={(e) => setPortalPassword(e.target.value)}
                minLength={8}
              />
            )}
            {errors.portalPassword && <p className="text-xs text-red-600 mt-1">{errors.portalPassword[0]}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-plum text-ivory rounded-lg py-3 font-medium hover:bg-plum-deep transition disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Confirm my pledge"}
          </button>
        </form>

        <p className="text-center text-xs text-plum/40 mt-6 pb-12">
          Powered by Grantispro — scholarship and donor management for {data.tenant.name}.
        </p>
      </div>
    </main>
  );
}
