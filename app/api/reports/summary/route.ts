import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session-helpers";
import { buildReportSummary } from "@/lib/report-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await buildReportSummary(session.user.tenantId);
  return NextResponse.json(summary);
}
