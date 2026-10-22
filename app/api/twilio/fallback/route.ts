import { NextRequest } from "next/server";
import twilio from "twilio";
import { businessByNumber, db } from "@/lib/db";
import { readTwilioForm, twiml } from "@/lib/twilio-request";

// Set as the Twilio number's "voice fallback URL". If the AI receptionist is
// down or errors, Twilio calls this and we put the caller straight through to
// the tradie's mobile, so no call is ever lost.
export async function POST(req: NextRequest) {
  const params = await readTwilioForm(req, "/api/twilio/fallback");
  if (!params) return new Response("bad signature", { status: 401 });

  const response = new twilio.twiml.VoiceResponse();
  const business = await businessByNumber(params.To);
  if (!business) {
    response.say({ language: "en-AU" }, "Sorry, this number isn't available right now.");
    return twiml(response.toString());
  }

  await db().from("calls").insert({
    business_id: business.id,
    from_number: params.From,
    outcome: "fallback",
    summary: `AI receptionist unavailable (${params.ErrorCode ?? "no error code"}), forwarded to owner`,
  });

  response.dial({ callerId: params.From, timeout: 25 }, business.owner_mobile);
  return twiml(response.toString());
}
