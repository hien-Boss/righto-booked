import { db } from "./db";
import { TemplateKey } from "./templates";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function schedule(rows: {
  business_id: string;
  customer_id: string;
  job_id: string | null;
  template: TemplateKey;
  send_at: Date;
}[]): Promise<void> {
  const { error } = await db()
    .from("scheduled_messages")
    .insert(rows.map((r) => ({ ...r, send_at: r.send_at.toISOString() })));
  if (error) throw error;
}

type JobRef = { id: string; business_id: string; customer_id: string };

export async function scheduleQuoteFollowUps(job: JobRef, quotedAt = new Date()): Promise<void> {
  const base = { business_id: job.business_id, customer_id: job.customer_id, job_id: job.id };
  await schedule([
    { ...base, template: "quote_day2", send_at: new Date(quotedAt.getTime() + 2 * DAY) },
    { ...base, template: "quote_day7", send_at: new Date(quotedAt.getTime() + 7 * DAY) },
  ]);
}

export async function scheduleAfterJobDone(job: JobRef, trade: string, doneAt = new Date()): Promise<void> {
  const base = { business_id: job.business_id, customer_id: job.customer_id, job_id: job.id };
  const rows = [{ ...base, template: "review_request" as TemplateKey, send_at: new Date(doneAt.getTime() + 2 * HOUR) }];
  if (trade === "aircon") {
    rows.push({ ...base, template: "aircon_service_reminder", send_at: new Date(doneAt.getTime() + 335 * DAY) });
  }
  await schedule(rows);
}

// Stop chasing a quote once the job is won or lost.
export async function cancelPending(jobId: string, templatesToCancel: TemplateKey[]): Promise<void> {
  const { error } = await db()
    .from("scheduled_messages")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("job_id", jobId)
    .in("template", templatesToCancel)
    .is("sent_at", null)
    .is("cancelled_at", null);
  if (error) throw error;
}
