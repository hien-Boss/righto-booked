// Wording matches sms-templates.md. Marketing templates must carry an opt-out
// and are only sent to customers with consent who haven't replied STOP.

export const templates = {
  missed_call: {
    marketing: false,
    text: "Hi, it's {business_name}. Sorry we missed you, we're on a job. Reply with what you need and your suburb, and we'll get back to you today.",
  },
  booked_confirmation: {
    marketing: false,
    text: "{business_name}: you're booked for {when} at {address}. {owner_first_name} will text when on the way. Reply C to change.",
  },
  callback_confirmation: {
    marketing: false,
    text: "{business_name}: thanks {caller_name}, we've got your details. {owner_first_name} will ring you back soon.",
  },
  tradie_summary: {
    marketing: false,
    text: "NEW JOB{urgent_tag}: {caller_name}, {suburb}. {job}. {next_step}. Call: {caller_mobile}",
  },
  booking_reminder: {
    marketing: false,
    text: "{business_name}: reminder, {owner_first_name} is coming {when}. Reply C to change.",
  },
  opt_out_confirmation: {
    marketing: false,
    text: "{business_name}: you won't get any more marketing texts from us.",
  },
  reschedule_ack: {
    marketing: false,
    text: "No worries, {owner_first_name} will be in touch to change the time.",
  },
  quote_day2: {
    marketing: true,
    text: "Hi {caller_name}, {owner_first_name} from {business_name}. Any questions on the quote for {job}? Happy to help. Reply STOP to opt out",
  },
  quote_day7: {
    marketing: true,
    text: "Hi {caller_name}, just checking in on your {job} quote. We can usually fit you in this week. Reply STOP to opt out",
  },
  review_request: {
    marketing: true,
    text: "Thanks for having us, {caller_name}! A quick Google review helps a local business heaps: {review_link} Reply STOP to opt out",
  },
  aircon_service_reminder: {
    marketing: true,
    text: "Hi {caller_name}, {business_name} here. Your aircon's due for its yearly service before summer hits. Book: {booking_link} Reply STOP to opt out",
  },
  hot_water_check: {
    marketing: true,
    text: "Hi {caller_name}, {business_name} here. Time for a quick hot water system check? Book: {booking_link} Reply STOP to opt out",
  },
} as const;

export type TemplateKey = keyof typeof templates;

export function isTemplateKey(key: string): key is TemplateKey {
  return key in templates;
}

export function render(key: TemplateKey, vars: Record<string, string | null | undefined>): string {
  return templates[key].text
    .replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
