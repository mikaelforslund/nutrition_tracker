import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getSql()`select 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("health check failed", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
