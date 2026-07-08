import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";
import { generateReportPdf } from "@/lib/report-pdf";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reuse the same aggregation logic as the summary endpoint by calling it
  // internally would duplicate a network hop; instead we just re-run the
  // same queries here directly for a single server-side round trip.
  const origin = new URL(req.url).origin;
  const summaryRes = await fetch(`${origin}/api/reports/summary`, {
    headers: { cookie: req.headers.get("cookie") ?? "" },
  });
  if (!summaryRes.ok) {
    return NextResponse.json({ error: "Couldn't build report" }, { status: 500 });
  }
  const summary = await summaryRes.json();

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });

  let logoBytes: Uint8Array | null = null;
  if (tenant?.logoUrl) {
    try {
      const res = await fetch(tenant.logoUrl);
      if (res.ok) logoBytes = new Uint8Array(await res.arrayBuffer());
    } catch {
      // Missing/unreachable logo shouldn't block report generation.
    }
  }

  const pdfBytes = await generateReportPdf(summary, logoBytes);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(tenant?.name ?? "grantispro").replace(/\s+/g, "_")}_report.pdf"`,
    },
  });
}
