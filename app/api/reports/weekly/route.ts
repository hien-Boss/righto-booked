import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { clientCosts, formatReport } from "@/lib/costs";
import { sendAdminText } from "@/lib/sms";

const DAYS = 7;

// Run by Vercel cron every Monday 8:30am Adelaide time (Sunday 22:00 UTC;
// 7:30am in winter). Texts Righto Booked an estimate of last week's costs per client.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const end = new Date();
  const start = new Date(end.getTime() - DAYS * 24 * 60 * 60 * 1000);
  const since = start.toISOString();

  const [businesses, calls, texts] = await Promise.all([
    db().from("businesses").select("id, name").eq("active", true),
    db().from("calls").select("business_id, duration_seconds").gte("created_at", since),
    db().from("messages").select("business_id, body").eq("direction", "out").gte("created_at", since),
  ]);
  for (const result of [businesses, calls, texts]) if (result.error) throw result.error;

  const costs = clientCosts(
    { businesses: businesses.data ?? [], calls: calls.data ?? [], texts: texts.data ?? [], days: DAYS },
    env.rates(),
  );
  const label = `${formatDay(start)} to ${formatDay(end)}`;
  const report = formatReport(costs, label);

  await sendAdminText(report);
  return NextResponse.json({ ok: true, report });
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Adelaide", day: "numeric", month: "short" }).format(date);
}
