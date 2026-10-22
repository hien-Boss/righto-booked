import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export type Business = {
  id: string;
  name: string;
  trade: "aircon" | "plumbing" | "electrical";
  owner_first_name: string;
  owner_mobile: string;
  twilio_number: string;
  review_link: string | null;
  booking_link: string | null;
  timezone: string;
};

export type Customer = {
  id: string;
  business_id: string;
  first_name: string | null;
  mobile: string;
  suburb: string | null;
  marketing_consent: boolean;
  opted_out_at: string | null;
};

let client: SupabaseClient | null = null;

// Server-side only: the service role key bypasses row level security.
export function db(): SupabaseClient {
  client ??= createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false },
  });
  return client;
}

export async function businessByNumber(twilioNumber: string): Promise<Business | null> {
  const { data, error } = await db()
    .from("businesses")
    .select("*")
    .eq("twilio_number", twilioNumber)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCustomer(
  businessId: string,
  mobile: string,
  fields: Partial<Pick<Customer, "first_name" | "suburb"> & { address: string; marketing_consent: boolean }> = {},
): Promise<Customer> {
  const row: Record<string, unknown> = { business_id: businessId, mobile };
  for (const [key, value] of Object.entries(fields)) {
    // Skip blanks and false, so a later call never wipes earlier details or consent.
    if (value !== undefined && value !== null && value !== "" && value !== false) row[key] = value;
  }
  if (fields.marketing_consent) row.marketing_consent_at = new Date().toISOString();

  const { data, error } = await db()
    .from("customers")
    .upsert(row, { onConflict: "business_id,mobile" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
