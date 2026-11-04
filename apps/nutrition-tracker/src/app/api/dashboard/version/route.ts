import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSql, withUser } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { mealsVersion } from "@/lib/nutrition/repository";
import { sessionsVersion } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A fingerprint of the dashboard's data, so the browser knows when to reload. */
export async function GET() {
  // Mock mode's dashboard can show anyone, so its version covers everyone.
  if (getEnv().AUTH_MODE === "mock") {
    const version = `${await getSql().begin(mealsVersion)}:${await sessionsVersion()}`;
    return NextResponse.json({ version }, { headers: { "Cache-Control": "no-store" } });
  }

  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  const version = await withUser(user.id, mealsVersion);
  return NextResponse.json({ version }, { headers: { "Cache-Control": "no-store" } });
}
