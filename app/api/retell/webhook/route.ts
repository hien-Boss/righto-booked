import { NextRequest, NextResponse } from "next/server";
import Retell from "retell-sdk";
import { businessByNumber, db, upsertCustomer } from "@/lib/db";
import { env } from "@/lib/env";
import { sendTemplate, textTradie } from "@/lib/sms";
import { render } from "@/lib/templates";
import { formatWhen } from "@/lib/time";

// Fields set up as "post-call analysis" in the Retell agent (see README).
type CallAnalysis = {
  call_summary?: string;
  custom_analysis_data?: {
    caller_name?: string;
    caller_mobile?: string;
    suburb?: string;
    address?: string;
    job_summary?: string;
    urgent?: boolean;
    booked_for?: string; // ISO time if the agent booked a visit
    marketing_consent?: boolean;
    transferred?: boolean;
  };
};

type RetellCall = {
  call_id: string;
  from_number: string;
  to_number: string;
  start_timestamp?: number;
  end_timestamp?: number;
  recording_url?: string;
  call_analysis?: CallAnalysis;
};

const MIN_REAL_CALL_SECONDS = 15;

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-retell-signature") ?? "";
  if (!(await Retell.verify(raw, env.retellApiKey(), signature))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const { event, call } = JSON.parse(raw) as { event: string; call: RetellCall };
  // Retell also sends call_started and call_ended; we act once analysis is ready.
  if (event !== "call_analyzed") return NextResponse.json({ ok: true });

  const business = await businessByNumber(call.to_number);
  if (!business) return NextResponse.json({ error: "unknown number" }, { status: 404 });

  // Retell retries webhooks; skip calls we've already handled.
  const { data: seen } = await db().from("calls").select("id").eq("retell_call_id", call.call_id).maybeSingle();
  if (seen) return NextResponse.json({ ok: true });

  const info = call.call_analysis?.custom_analysis_data ?? {};
  const seconds = call.start_timestamp && call.end_timestamp
    ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
    : 0;
  const mobile = info.caller_mobile || call.from_number;
  const missed = !info.job_summary || seconds < MIN_REAL_CALL_SECONDS;

  const customer = await upsertCustomer(business.id, mobile, {
    first_name: info.caller_name,
    suburb: info.suburb,
    address: info.address,
    marketing_consent: info.marketing_consent,
  });

  let jobId: string | null = null;
  if (!missed) {
    const { data: job, error } = await db()
      .from("jobs")
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        summary: info.job_summary,
        urgent: !!info.urgent,
        status: info.booked_for ? "booked" : "callback",
        booked_for: info.booked_for || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    jobId = job.id;
  }

  await db().from("calls").insert({
    business_id: business.id,
    customer_id: customer.id,
    job_id: jobId,
    retell_call_id: call.call_id,
    from_number: call.from_number,
    duration_seconds: seconds,
    summary: call.call_analysis?.call_summary ?? null,
    recording_url: call.recording_url ?? null,
    outcome: missed ? "missed" : info.transferred ? "transferred" : "handled",
  });

  if (missed) {
    await sendTemplate(business, customer, "missed_call");
    await textTradie(business, `Missed call from ${mobile}, sent them a text-back.`, "tradie_missed");
    return NextResponse.json({ ok: true });
  }

  const when = info.booked_for ? formatWhen(info.booked_for, business.timezone) : null;
  await textTradie(
    business,
    render("tradie_summary", {
      urgent_tag: info.urgent ? " (URGENT)" : "",
      caller_name: customer.first_name ?? "Caller",
      suburb: customer.suburb ?? "suburb unknown",
      job: info.job_summary,
      next_step: when ? `Booked ${when}` : "Needs a call back",
      caller_mobile: mobile,
    }),
    "tradie_summary",
  );

  if (when && jobId) {
    const remindAt = new Date(new Date(info.booked_for!).getTime() - 24 * 60 * 60 * 1000);
    if (remindAt > new Date()) {
      await db().from("scheduled_messages").insert({
        business_id: business.id,
        customer_id: customer.id,
        job_id: jobId,
        template: "booking_reminder",
        send_at: remindAt.toISOString(),
      });
    }
  }

  if (when) {
    await sendTemplate(business, customer, "booked_confirmation", { when, address: info.address ?? customer.suburb });
  } else {
    await sendTemplate(business, customer, "callback_confirmation");
  }

  return NextResponse.json({ ok: true });
}
