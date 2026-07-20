"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import StatCard from "@/components/stat-card";
import { formatCurrency, fundCategoryLabel } from "@/lib/currency";
import { Download, BarChart3, Users, GraduationCap } from "lucide-react";

type Summary = {
  tenantName: string;
  defaultCurrency: string;
  scholarships: {
    totalGranted: number;
    byType: Record<string, number>;
    byReason: Record<string, number>;
    totalByCurrency: Record<string, number>;
  };
  applications: {
    total: number;
    byStatus: Record<string, number>;
    averageScore: number | null;
  };
  programs: {
    total: number;
    active: number;
    list: { name: string; isActive: boolean; applications: number }[];
  };
  donors: { total: number; byType: Record<string, number> };
  pledges: {
    total: number;
    received: number;
    committedOnly: number;
    totalByCurrency: Record<string, number>;
    byCategory: Record<string, number>;
  };
  funds: {
    total: number;
    byCategory: Record<string, number>;
    list: { name: string; category: string; balance: number; currency: string }[];
  };
  zakat: { eligibleApplicants: number };
};

const AWARD_TYPE_LABEL: Record<string, string> = {
  FULL: "Full Scholarship",
  PARTIAL_PERCENT: "Partial %",
  FIXED_AMOUNT: "Fixed Amount",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  SHORTLISTED: "Shortlisted",
  AWARDED: "Awarded",
  REJECTED: "Rejected",
  RENEWED: "Renewed",
};

const DONOR_TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: "Individual",
  CORPORATE_CSR: "Corporate CSR",
  GOVERNMENT_GRANT: "Government grant",
  FOREIGN_FUNDING: "Foreign funding",
};

function Bar({ label, value, max, tone = "plum" }: { label: string; value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barColor = tone === "emerald" ? "bg-emerald" : "bg-plum";
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-plum/70">{label}</span>
        <span className="text-plum font-medium">{value}</span>
      </div>
      <div className="h-2 bg-plum/5 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [me, setMe] = useState<{ name?: string; role?: string; tenantName?: string }>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [rosterCampusFilter, setRosterCampusFilter] = useState("");
  const [rosterClassFilter, setRosterClassFilter] = useState("");
  const [roster, setRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  const [awardsCampusFilter, setAwardsCampusFilter] = useState("");
  const [awardsList, setAwardsList] = useState<any[]>([]);
  const [awardsLoading, setAwardsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/me").then((r) => r.json()), fetch("/api/reports/summary").then((r) => r.json())]).then(
      ([meData, summaryData]) => {
        setMe(meData);
        setSummary(summaryData);
        setLoading(false);
      }
    );
    fetch("/api/campuses").then((r) => r.json()).then((d) => setCampuses(d.campuses ?? []));
    fetch("/api/classes").then((r) => r.json()).then((d) => setClasses(d.classes ?? []));
  }, []);

  useEffect(() => {
    setRosterLoading(true);
    const params = new URLSearchParams();
    if (rosterCampusFilter) params.set("campusId", rosterCampusFilter);
    if (rosterClassFilter) params.set("classId", rosterClassFilter);
    fetch(`/api/reports/applicants?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setRoster(d.applicants ?? []);
        setRosterLoading(false);
      });
  }, [rosterCampusFilter, rosterClassFilter]);

  useEffect(() => {
    setAwardsLoading(true);
    const params = new URLSearchParams();
    if (awardsCampusFilter) params.set("campusId", awardsCampusFilter);
    fetch(`/api/reports/awards?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setAwardsList(d.awards ?? []);
        setAwardsLoading(false);
      });
  }, [awardsCampusFilter]);

  if (loading || !summary) {
    return (
      <DashboardLayout tenantName={me.tenantName} userName={me.name} role={me.role}>
        <p className="text-plum/60">Loading…</p>
      </DashboardLayout>
    );
  }

  const maxAwardType = Math.max(1, ...Object.values(summary.scholarships.byType));
  const maxStatus = Math.max(1, ...Object.values(summary.applications.byStatus));
  const maxDonorType = Math.max(1, ...Object.values(summary.donors.byType));
  const maxFundCategory = Math.max(1, ...Object.values(summary.funds.byCategory));

  return (
    <DashboardLayout tenantName={me.tenantName} userName={me.name} role={me.role}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-semibold text-xl text-plum">Reports and analytics</h1>
        <a
          href="/api/reports/pdf"
          className="bg-plum text-ivory rounded-lg px-4 py-2 text-sm font-medium hover:bg-plum-deep transition flex items-center gap-1.5"
        >
          <Download size={16} strokeWidth={2} />
          Download PDF report
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Scholarships granted" value={summary.scholarships.totalGranted} />
        <StatCard label="Total applications" value={summary.applications.total} />
        <StatCard label="Donors" value={summary.donors.total} />
        <StatCard label="Zakat-eligible students" value={summary.zakat.eligibleApplicants} tone="dark" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-5">
          <h2 className="font-medium text-plum mb-4 flex items-center gap-2">
            <BarChart3 size={17} strokeWidth={1.75} />
            Scholarships by type
          </h2>
          {Object.entries(summary.scholarships.byType).length === 0 ? (
            <p className="text-sm text-plum/40">No grants yet.</p>
          ) : (
            Object.entries(summary.scholarships.byType).map(([type, count]) => (
              <Bar key={type} label={AWARD_TYPE_LABEL[type] ?? type} value={count} max={maxAwardType} />
            ))
          )}
          {Object.keys(summary.scholarships.totalByCurrency).length > 0 && (
            <div className="mt-4 pt-4 border-t border-plum/5">
              <p className="text-xs text-plum/50 mb-1">Total value granted</p>
              {Object.entries(summary.scholarships.totalByCurrency).map(([cur, amt]) => (
                <p key={cur} className="text-sm text-plum">{formatCurrency(amt, cur)}</p>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-5">
          <h2 className="font-medium text-plum mb-4 flex items-center gap-2">
            <BarChart3 size={17} strokeWidth={1.75} />
            Applications by status
          </h2>
          {Object.entries(summary.applications.byStatus).length === 0 ? (
            <p className="text-sm text-plum/40">No applications yet.</p>
          ) : (
            Object.entries(summary.applications.byStatus).map(([status, count]) => (
              <Bar key={status} label={STATUS_LABEL[status] ?? status} value={count} max={maxStatus} tone="emerald" />
            ))
          )}
          {summary.applications.averageScore !== null && (
            <p className="text-xs text-plum/50 mt-3">
              Average eligibility score: <span className="text-plum">{summary.applications.averageScore}</span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-5">
          <h2 className="font-medium text-plum mb-4 flex items-center gap-2">
            <BarChart3 size={17} strokeWidth={1.75} />
            Donors by type
          </h2>
          {Object.entries(summary.donors.byType).length === 0 ? (
            <p className="text-sm text-plum/40">No donors yet.</p>
          ) : (
            Object.entries(summary.donors.byType).map(([type, count]) => (
              <Bar key={type} label={DONOR_TYPE_LABEL[type] ?? type} value={count} max={maxDonorType} />
            ))
          )}
          <div className="mt-4 pt-4 border-t border-plum/5 flex justify-between text-sm">
            <span className="text-plum/60">Pledges received vs committed</span>
            <span className="text-plum">
              {summary.pledges.received} received &middot; {summary.pledges.committedOnly} committed only
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-plum/5 p-5">
          <h2 className="font-medium text-plum mb-4 flex items-center gap-2">
            <BarChart3 size={17} strokeWidth={1.75} />
            Fund balance by category
          </h2>
          {Object.entries(summary.funds.byCategory).length === 0 ? (
            <p className="text-sm text-plum/40">No funds yet.</p>
          ) : (
            Object.entries(summary.funds.byCategory).map(([cat, balance]) => (
              <Bar
                key={cat}
                label={fundCategoryLabel(cat)}
                value={Math.round(balance)}
                max={Math.round(maxFundCategory)}
                tone="emerald"
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-4 bg-white rounded-2xl shadow-card border border-plum/5 p-5">
        <h2 className="font-medium text-plum mb-4">Programs</h2>
        {summary.programs.list.length === 0 ? (
          <p className="text-sm text-plum/40">No programs yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {summary.programs.list.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm py-1.5 border-b border-plum/5 last:border-0">
                <span className="text-plum">{p.name}</span>
                <span className="text-plum/50">
                  {p.applications} applications &middot; {p.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 bg-white rounded-2xl shadow-card border border-plum/5 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-medium text-plum flex items-center gap-2">
            <Users size={17} strokeWidth={1.75} />
            Applicant roster
          </h2>
          <div className="flex items-center gap-2">
            {campuses.length > 0 && (
              <select
                className="text-sm rounded-lg border border-plum/20 px-2.5 py-1.5"
                value={rosterCampusFilter}
                onChange={(e) => setRosterCampusFilter(e.target.value)}
              >
                <option value="">All campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {classes.length > 0 && (
              <select
                className="text-sm rounded-lg border border-plum/20 px-2.5 py-1.5"
                value={rosterClassFilter}
                onChange={(e) => setRosterClassFilter(e.target.value)}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <a
              href={`/api/reports/applicants/pdf?${rosterCampusFilter ? `campusId=${rosterCampusFilter}&` : ""}${
                rosterClassFilter ? `classId=${rosterClassFilter}` : ""
              }`}
              className="bg-plum text-ivory rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-plum-deep transition flex items-center gap-1.5"
            >
              <Download size={14} strokeWidth={2} />
              PDF
            </a>
          </div>
        </div>

        {rosterLoading ? (
          <p className="text-sm text-plum/40">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="text-sm text-plum/40">No students match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-plum/50 border-b border-plum/10">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Parent / Guardian</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium">Campus</th>
                  <th className="py-2 pr-3 font-medium">Class</th>
                  <th className="py-2 pr-3 font-medium">Program</th>
                  <th className="py-2 pr-3 font-medium">Applied</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((a, i) => (
                  <tr key={i} className="border-b border-plum/5 last:border-0">
                    <td className="py-2 pr-3 text-plum">{a.fullName}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.guardianName ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.contactEmail ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.contactPhone ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.campusName ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.className ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.latestProgram ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">
                      {a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-2 pr-3 text-plum/70">{a.latestStatus?.replace("_", " ") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-4 bg-white rounded-2xl shadow-card border border-plum/5 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-medium text-plum flex items-center gap-2">
            <GraduationCap size={17} strokeWidth={1.75} />
            Scholarship awards summary — by campus
          </h2>
          <div className="flex items-center gap-2">
            {campuses.length > 0 && (
              <select
                className="text-sm rounded-lg border border-plum/20 px-2.5 py-1.5"
                value={awardsCampusFilter}
                onChange={(e) => setAwardsCampusFilter(e.target.value)}
              >
                <option value="">All campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <a
              href={`/api/reports/awards/pdf${awardsCampusFilter ? `?campusId=${awardsCampusFilter}` : ""}`}
              className="bg-plum text-ivory rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-plum-deep transition flex items-center gap-1.5"
            >
              <Download size={14} strokeWidth={2} />
              PDF (grouped by campus, with subtotals)
            </a>
          </div>
        </div>

        {awardsLoading ? (
          <p className="text-sm text-plum/40">Loading…</p>
        ) : awardsList.length === 0 ? (
          <p className="text-sm text-plum/40">No scholarships awarded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-plum/50 border-b border-plum/10">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Parent / Guardian</th>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium">Campus</th>
                  <th className="py-2 pr-3 font-medium">Class</th>
                  <th className="py-2 pr-3 font-medium">Program</th>
                  <th className="py-2 pr-3 font-medium">Award type</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Duration</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {awardsList.map((a, i) => (
                  <tr key={i} className="border-b border-plum/5 last:border-0">
                    <td className="py-2 pr-3 text-plum">{a.studentName}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.guardianName ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.contactPhone ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.campusName ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.className ?? "—"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.programName ?? "Direct grant"}</td>
                    <td className="py-2 pr-3 text-plum/70">
                      {a.awardType === "FULL" ? "Full" : a.awardType === "PARTIAL_PERCENT" ? `${a.percentValue}% Partial` : "Fixed"}
                    </td>
                    <td className="py-2 pr-3 text-plum/70">{formatCurrency(a.amount, a.currency)}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.durationMonths ? `${a.durationMonths} mo` : "Ongoing"}</td>
                    <td className="py-2 pr-3 text-plum/70">{a.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-plum/40 mt-3">
              This preview is a flat list — the downloaded PDF groups these by campus with
              per-campus and grand-total subtotals.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
