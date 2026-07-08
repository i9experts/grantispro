import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session-helpers";
import { generateReportPdf } from "@/lib/report-pdf";
import { buildReportSummary } from "@/lib/report-summary";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let summary;
  try {
    summary = await buildReportSummary(session.user.tenantId);
  } catch (err: any) {
    console.error("Report summary build failed:", err?.message ?? err);
    return NextResponse.json({ error: `Couldn't build report data: ${err?.message ?? "unknown error"}` }, { status: 500 });
  }

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

  try {
    const pdfBytes = await generateReportPdf(summary, logoBytes);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(tenant?.name ?? "grantispro").replace(/\s+/g, "_")}_report.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF generation failed:", err?.message ?? err);
    return NextResponse.json({ error: `PDF generation failed: ${err?.message ?? "unknown error"}` }, { status: 500 });
  }
}
