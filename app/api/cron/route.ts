import { NextRequest, NextResponse } from "next/server";
import { Business, Customer, db } from "@/lib/db";
import { env } from "@/lib/env";
import { MarketingBlocked, sendTemplate } from "@/lib/sms";
import { isTemplateKey } from "@/lib/templates";
import { formatWhen } from "@/lib/time";

const BATCH = 50;

// Run every 10 minutes by Vercel cron: sends any scheduled texts that are due.
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const { data: due, error } = await db()
    .from("scheduled_messages")
    .select("id, template, job_id, business:businesses(*), customer:customers(*), job:jobs(summary, booked_for)")
    .is("sent_at", null)
    .is("cancelled_at", null)
    .lte("send_at", new Date().toISOString())
    .order("send_at")
    .limit(BATCH);
  if (error) throw error;

  let sent = 0;
  for (const row of due ?? []) {
    const business = row.business as unknown as Business;
    const customer = row.customer as unknown as Customer;
    const job = row.job as unknown as { summary: string; booked_for: string | null } | null;
    const now = new Date().toISOString();

    if (!isTemplateKey(row.template) || !withinSendingHours(business.timezone)) continue;

    try {
      await sendTemplate(business, customer, row.template, {
        job: job?.summary,
        when: job?.booked_for ? formatWhen(job.booked_for, business.timezone) : undefined,
      });
      await db().from("scheduled_messages").update({ sent_at: now }).eq("id", row.id);
      sent++;
    } catch (err) {
      const blocked = err instanceof MarketingBlocked;
      await db()
        .from("scheduled_messages")
        .update(blocked ? { cancelled_at: now, error: "no consent" } : { error: String(err) })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({ sent, checked: due?.length ?? 0 });
}

// Marketing texts only go out 9am to 7pm local time, never Sunday morning.
function withinSendingHours(timeZone: string): boolean {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone, hour: "numeric", hourCycle: "h23", weekday: "short" })
    .formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  if (weekday === "Sun" && hour < 12) return false;
  return hour >= 9 && hour < 19;
}
