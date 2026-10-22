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
};
