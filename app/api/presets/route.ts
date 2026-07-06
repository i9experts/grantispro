import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const presets = await prisma.presetCriteria.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  const grouped: Record<string, typeof presets> = {};
  for (const p of presets) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  return NextResponse.json({ groups: grouped });
}
