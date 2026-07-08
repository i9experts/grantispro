"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard-layout";
import { Plus, GraduationCap, Download, Trash2 } from "lucide-react";

type Award = {
  id: string;
  scholarshipName: string;
  awardType: string;
  percentValue: number | null;
  amount: number;
  currency: string;
  reason: string | null;
  startDate: string;
  durationMonths: number | null;
  studentName: string;
  fundName: string;
};

const TYPE_LABEL: Record<string, string> = {
  FULL: "Full Scholarship",
  PARTIAL_PERCENT: "Partial %",
  FIXED_AMOUNT: "Fixed Amount",
};

export default function GrantsPage() {
  const [me, setMe] = useState<{ name?: string; role?: string; tenantName?: string }>({});
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/me").then((r) => r.json()), fetch("/api/awards").then((r) => r.json())]).then(
      ([meData, awardsData]) => {
        setMe(meData);
        setAwards(awardsData.awards ?? []);
        setLoading(false);
      }
    );
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete the grant for ${name}? This can't be undone.`)) return;
    const res = await fetch(`/api/awards/${id}`, { method: "DELETE" });
    if (res.ok) setAwards((a) => a.filter((award) => award.id !== id));
  }

  return (
    <DashboardLayout tenantName={me.tenantName} userName={me.name} role={me.role}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-semibold text-xl text-plum">Scholarship grants</h1>
        <Link
          href="/dashboard/grants/new"
          className="bg-plum text-ivory rounded-lg px-4 py-2 text-sm font-medium hover:bg-plum-deep transition flex items-center gap-1.5"
        >
          <Plus size={16} strokeWidth={2} />
          Grant scholarship
        </Link>
      </div>

      {loading ? (
        <p className="text-plum/60">Loading…</p>
      ) : awards.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-plum/5 flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={22} className="text-plum/40" strokeWidth={1.75} />
          </div>
          <p className="text-plum/70">No scholarships granted yet.</p>
          <p className="text-sm text-plum/40 mt-1">Grant one directly to a student to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {awards.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl shadow-card border border-plum/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-plum">{a.studentName}</p>
                  <p className="text-sm text-plum/50 mt-0.5">
                    {a.scholarshipName} &middot; {TYPE_LABEL[a.awardType]}
                    {a.awardType === "PARTIAL_PERCENT" && ` (${a.percentValue}%)`} &middot; {a.fundName}
                  </p>
                  <p className="text-xs text-plum/40 mt-1">
                    {a.reason ?? "No reason specified"} &middot; Started{" "}
                    {new Date(a.startDate).toLocaleDateString()} &middot;{" "}
                    {a.durationMonths ? `${a.durationMonths} months` : "Ongoing"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <a
                    href={`/api/awards/${a.id}/certificate`}
                    className="flex items-center gap-1.5 text-sm text-emerald-dark hover:underline"
                  >
                    <Download size={15} strokeWidth={1.75} />
                    Certificate
                  </a>
                  <button
                    onClick={() => handleDelete(a.id, a.studentName)}
                    className="flex items-center gap-1.5 text-sm text-red-600/70 hover:text-red-600"
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
