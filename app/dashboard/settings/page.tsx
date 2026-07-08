"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { CURRENCIES } from "@/lib/currency";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const [me, setMe] = useState<{ name?: string; role?: string; tenantName?: string }>({});
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/me").then((r) => r.json()), fetch("/api/tenant").then((r) => r.json())]).then(
      ([meData, tenantData]) => {
        setMe(meData);
        setDefaultCurrency(tenantData.tenant?.defaultCurrency ?? "USD");
        setLogoUrl(tenantData.tenant?.logoUrl ?? null);
        setLoading(false);
      }
    );
  }, []);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "grantispro/institution-logos");

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setLogoUploading(false);

    if (res.ok) {
      const data = await res.json();
      setLogoUrl(data.url);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/tenant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultCurrency, logoUrl }),
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
      </div>
    </DashboardLayout>
  );
}
