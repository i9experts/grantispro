"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import TagListManager from "@/components/tag-list-manager";
import { CURRENCIES } from "@/lib/currency";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const [me, setMe] = useState<{ name?: string; role?: string; tenantName?: string }>({});
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountTitle, setBankAccountTitle] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/me").then((r) => r.json()), fetch("/api/tenant").then((r) => r.json())]).then(
      ([meData, tenantData]) => {
        setMe(meData);
        setDefaultCurrency(tenantData.tenant?.defaultCurrency ?? "USD");
        setLogoUrl(tenantData.tenant?.logoUrl ?? null);
        setBankName(tenantData.tenant?.bankName ?? "");
        setBankAccountTitle(tenantData.tenant?.bankAccountTitle ?? "");
        setBankAccountNumber(tenantData.tenant?.bankAccountNumber ?? "");
        setBankIban(tenantData.tenant?.bankIban ?? "");
        setSignatoryName(tenantData.tenant?.signatoryName ?? "");
        setSignatoryTitle(tenantData.tenant?.signatoryTitle ?? "");
        setLoading(false);
      }
    );
  }, []);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setLogoError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "grantispro/institution-logos");

    let uploadedUrl: string | null = null;
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setLogoError(data.error ?? "Upload failed for an unknown reason.");
        setLogoUploading(false);
        return;
      }
      uploadedUrl = data.url;
      setLogoUrl(data.url);
    } catch (err) {
      setLogoError("Couldn't reach the upload service. Check your connection and try again.");
      setLogoUploading(false);
      return;
    }
    setLogoUploading(false);

    // Auto-save immediately so upload + save isn't a confusing two-step
    // process — this was the likely cause of "logo isn't uploading":
    // it *was* uploading, just not persisting until a separate manual save.
    if (uploadedUrl) {
      setSaving(true);
      const saveRes = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: uploadedUrl }),
      });
      setSaving(false);
      if (saveRes.ok) {
        setSaved(true);
      } else {
        const data = await saveRes.json();
        setLogoError(
          typeof data.error === "string"
            ? data.error
            : "Logo uploaded but couldn't be saved. Try clicking Save settings below."
        );
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/tenant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultCurrency,
        logoUrl,
        bankName,
        bankAccountTitle,
        bankAccountNumber,
        bankIban,
        signatoryName,
        signatoryTitle,
      }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  if (loading) {
    return (
      <DashboardLayout tenantName={me.tenantName} userName={me.name} role={me.role}>
        <p className="text-plum/60">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout tenantName={me.tenantName} userName={me.name} role={me.role}>
      <div className="max-w-lg">
        <h1 className="font-display font-semibold text-xl text-plum mb-6">Settings</h1>

        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-plum mb-1">Default currency</label>
            <p className="text-xs text-plum/50 mb-2">
              Used for dashboard totals and as the default when creating new funds, pledges, and
              grants. Individual records can still use a different currency.
            </p>
            <select
              className="w-full rounded-lg border border-plum/20 px-3 py-2"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-plum/10 pt-6">
            <label className="block text-sm font-medium text-plum mb-1">Institution logo</label>
            <p className="text-xs text-plum/50 mb-2">
              Appears on scholarship certificates and, eventually, the donor portal.
            </p>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Institution logo" className="w-16 h-16 rounded-lg object-contain border border-plum/10 bg-white" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-plum/5 flex items-center justify-center text-xs text-plum/40 text-center">
                  No logo
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm" />
            </div>
            {logoUploading && <p className="text-xs text-plum/50 mt-1">Uploading…</p>}
            {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
          </div>

          <div className="border-t border-plum/10 pt-6">
            <label className="block text-sm font-medium text-plum mb-1">Bank details</label>
            <p className="text-xs text-plum/50 mb-3">
              Shown to prospective donors on your program invitation pages when they choose "Bank
              Deposit" as their payment method.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-plum/60 mb-1">Bank name</label>
                <input
                  className="w-full rounded-lg border border-plum/20 px-3 py-2 text-sm"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-plum/60 mb-1">Account title</label>
                <input
                  className="w-full rounded-lg border border-plum/20 px-3 py-2 text-sm"
                  value={bankAccountTitle}
                  onChange={(e) => setBankAccountTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-plum/60 mb-1">Account number</label>
                <input
                  className="w-full rounded-lg border border-plum/20 px-3 py-2 text-sm"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-plum/60 mb-1">IBAN (optional)</label>
                <input
                  className="w-full rounded-lg border border-plum/20 px-3 py-2 text-sm"
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-plum/10 pt-6">
            <label className="block text-sm font-medium text-plum mb-1">Certificate signatory</label>
            <p className="text-xs text-plum/50 mb-3">
              Printed on scholarship certificates — usually your founder, principal, or director,
              not necessarily whoever is logged in when a grant is made.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-plum/60 mb-1">Name</label>
                <input
                  className="w-full rounded-lg border border-plum/20 px-3 py-2 text-sm"
                  placeholder="e.g. Atiq ur Rehman Ayubi"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-plum/60 mb-1">Title</label>
                <input
                  className="w-full rounded-lg border border-plum/20 px-3 py-2 text-sm"
                  placeholder="e.g. Founder | Director"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-plum text-ivory rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-plum-deep transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} strokeWidth={1.75} />
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <p className="text-sm text-emerald-dark">Saved.</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <TagListManager
            title="Campuses"
            description="For multi-campus institutions — lets you filter students by campus."
            endpoint="/api/campuses"
            itemsKey="campuses"
          />
          <TagListManager
            title="Classes / grade levels"
            description="Your own naming — Grade 1-12, Hifz Year 1-5, whatever fits your institution."
            endpoint="/api/classes"
            itemsKey="classes"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
