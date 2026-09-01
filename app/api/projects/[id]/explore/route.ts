import { NextResponse } from "next/server";
import { runExplore } from "@/lib/scout/run-explore";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await runExplore(id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Explore failed" }, { status: 500 });
  }
}
