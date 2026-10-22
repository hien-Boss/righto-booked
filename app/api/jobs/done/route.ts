import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { cancelPending, scheduleAfterJobDone, scheduleQuoteFollowUps } from "@/lib/schedule";

type Body = { job_id: string; status: "quoted" | "won" | "lost" | "done" };

// Called from the dashboard when the tradie updates a job.
// For now only we can call it (with the admin key). TODO(phase 2): replace with
// the tradie's Supabase login and check they own the job.
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const { job_id, status } = (await req.json()) as Body;
  const now = new Date();

  const { data: job, error } = await db()
    .from("jobs")
    .update({
      status,
      ...(status === "quoted" ? { quoted_at: now.toISOString() } : {}),
      ...(status === "done" ? { done_at: now.toISOString() } : {}),
    })
    .eq("id", job_id)
    .select("id, business_id, customer_id, business:businesses(trade)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (status === "quoted") await scheduleQuoteFollowUps(job, now);
  if (status === "won" || status === "lost") await cancelPending(job.id, ["quote_day2", "quote_day7"]);
  if (status === "done") {
    await cancelPending(job.id, ["quote_day2", "quote_day7"]);
    const trade = (job.business as unknown as { trade: string }).trade;
    await scheduleAfterJobDone(job, trade, now);
  }

  return NextResponse.json({ ok: true });
}
