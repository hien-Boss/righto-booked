import { NextRequest } from "next/server";
import { businessByNumber, db, upsertCustomer } from "@/lib/db";
import { sendTemplate, textTradie } from "@/lib/sms";
import { readTwilioForm, twiml } from "@/lib/twilio-request";

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "NO MORE"]);
const CHANGE_WORDS = new Set(["C", "CHANGE", "RESCHEDULE"]);
const EMPTY = "<Response></Response>";

// Twilio posts here for every text a customer sends to a client's number.
export async function POST(req: NextRequest) {
  const params = await readTwilioForm(req, "/api/twilio/sms");
  if (!params) return new Response("bad signature", { status: 401 });

  const business = await businessByNumber(params.To);
  if (!business) return twiml(EMPTY);

  const from = params.From;
  const body = (params.Body ?? "").trim();
  const word = body.toUpperCase().replace(/[^A-Z ]/g, "").trim();
  const customer = await upsertCustomer(business.id, from);

  await db().from("messages").insert({
    business_id: business.id,
    customer_id: customer.id,
    direction: "in",
    to_number: params.To,
    from_number: from,
    body,
    kind: "inbound",
    twilio_sid: params.MessageSid,
  });

  if (STOP_WORDS.has(word)) {
    await db().from("customers").update({ opted_out_at: new Date().toISOString() }).eq("id", customer.id);
    await db()
      .from("scheduled_messages")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("customer_id", customer.id)
      .is("sent_at", null)
      .is("cancelled_at", null);
    await sendTemplate(business, customer, "opt_out_confirmation");
  } else if (CHANGE_WORDS.has(word)) {
    await textTradie(business, `${customer.first_name ?? from} wants to change their booking. Call: ${from}`, "tradie_reschedule");
    await sendTemplate(business, customer, "reschedule_ack");
  } else {
    await textTradie(business, `Text from ${customer.first_name ?? from}: "${body}" Reply to them on ${from}`, "tradie_forward");
  }

  return twiml(EMPTY);
}
