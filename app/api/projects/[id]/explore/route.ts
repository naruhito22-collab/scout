import { NextResponse } from "next/server";
import { runExplore } from "@/lib/scout/run-explore";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await runExplore(id);
    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error(`SCOUT explore failed for project ${id}`, e);
    const message = e instanceof Error ? e.message : "Explore failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
