function optionalNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  twilioSid: () => required("TWILIO_ACCOUNT_SID"),
  twilioToken: () => required("TWILIO_AUTH_TOKEN"),
  retellApiKey: () => required("RETELL_API_KEY"),
  appUrl: () => required("APP_URL"),
  cronSecret: () => required("CRON_SECRET"),
  // Where the weekly cost report goes (Righto Booked's own mobile and Twilio number).
  adminMobile: () => required("ADMIN_MOBILE"),
  adminFromNumber: () => required("ADMIN_FROM_NUMBER"),
  // Cost estimates, in USD. Update from the Retell and Twilio billing pages.
  rates: () => ({
    perMinuteUsd: optionalNumber("COST_PER_MINUTE_USD", 0.12),
    perTextUsd: optionalNumber("COST_PER_TEXT_USD", 0.065),
    perNumberMonthUsd: optionalNumber("COST_PER_NUMBER_MONTH_USD", 6),
    usdToAud: optionalNumber("USD_TO_AUD", 1.55),
  }),
};
