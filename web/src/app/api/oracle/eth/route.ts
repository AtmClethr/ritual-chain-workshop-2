import { NextResponse } from "next/server";
import { print, tape } from "@/lib/tape";

export async function GET() {
  return NextResponse.json(tape(), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { price?: unknown };
    return NextResponse.json(print(Number(b.price)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad" }, { status: 400 });
  }
}
