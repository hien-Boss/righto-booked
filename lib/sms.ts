import twilio from "twilio";
import { db, Business, Customer } from "./db";
import { env } from "./env";
import { render, templates, TemplateKey } from "./templates";

let client: ReturnType<typeof twilio> | null = null;
function twilioClient() {
  client ??= twilio(env.twilioSid(), env.twilioToken());
  return client;
}

export async function sendText(opts: {
  business: Business;
  to: string;
  body: string;
  kind: string;
  customerId?: string;
}): Promise<void> {
  const message = await twilioClient().messages.create({
    to: opts.to,
    from: opts.business.twilio_number,
    body: opts.body,
  });
  await db().from("messages").insert({
    business_id: opts.business.id,
    customer_id: opts.customerId ?? null,
    direction: "out",
    to_number: opts.to,
    from_number: opts.business.twilio_number,
    body: opts.body,
    kind: opts.kind,
    twilio_sid: message.sid,
  });
}

// For messages to Righto Booked itself, not to a tradie's customers.
export async function sendAdminText(body: string): Promise<void> {
  await twilioClient().messages.create({ to: env.adminMobile(), from: env.adminFromNumber(), body });
}

export class MarketingBlocked extends Error {}

// Sends a template to a customer, refusing marketing texts without consent (Spam Act).
export async function sendTemplate(
  business: Business,
  customer: Customer,
  key: TemplateKey,
  vars: Record<string, string | null | undefined> = {},
): Promise<void> {
  if (templates[key].marketing && (!customer.marketing_consent || customer.opted_out_at)) {
    throw new MarketingBlocked(`No marketing consent for customer ${customer.id}`);
  }
  const body = render(key, {
    business_name: business.name,
    owner_first_name: business.owner_first_name,
    review_link: business.review_link,
    booking_link: business.booking_link,
    caller_name: customer.first_name ?? "there",
    ...vars,
  });
  await sendText({ business, to: customer.mobile, body, kind: key, customerId: customer.id });
}

export async function textTradie(business: Business, body: string, kind: string): Promise<void> {
  await sendText({ business, to: business.owner_mobile, body, kind });
}
