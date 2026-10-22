import { NextRequest } from "next/server";
import twilio from "twilio";
import { env } from "./env";

// Reads a Twilio webhook form post and checks it really came from Twilio.
export async function readTwilioForm(req: NextRequest, path: string): Promise<Record<string, string> | null> {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const valid = twilio.validateRequest(env.twilioToken(), signature, `${env.appUrl()}${path}`, params);
  return valid ? params : null;
}

export function twiml(xml: string): Response {
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
}
