# Righto Booked app (starter code)

Drafted 22 Oct 2026. This is the Phase 2 core from the build plan, written ahead of time. It type-checks and builds (`npm run build`), but it has **not** run against real Retell, Twilio or Supabase accounts yet, because none exist. Nothing here is live.

## What each part does

| File | Job |
|---|---|
| `supabase/schema.sql` | The database: tradie businesses, customers, jobs, calls, texts, scheduled texts |
| `app/api/retell/webhook` | After each AI call: saves the customer and job, texts the tradie a summary, texts the caller a confirmation, books a day-before reminder. Short or empty calls get the missed-call text-back |
| `app/api/twilio/fallback` | If the AI is down, puts the caller straight through to the tradie's mobile |
| `app/api/twilio/sms` | Customer replies: STOP (opt out, cancels marketing texts), C (reschedule), anything else is forwarded to the tradie |
| `app/api/jobs/done` | When a job is quoted, won, lost or done: starts or cancels quote follow-ups, schedules the review request and next year's aircon service reminder |
| `app/api/cron` | Every 10 minutes, sends texts that are due, only 9am to 7pm local time, and only marketing texts with consent |
| `app/api/reports/weekly` | Every Monday morning, texts Righto Booked an estimated cost per client for the past week (call minutes, texts, number rental), in AUD |
| `lib/templates.ts` | Text wording, matching `docs/sms-templates.md` |

## Setting up once accounts exist

1. Supabase: new project in the Sydney region, run `supabase/schema.sql`.
2. Retell: create the agent from `docs/voice-agent-script.md`. Under post-call analysis add these fields: `caller_name`, `caller_mobile`, `suburb`, `address`, `job_summary` (text), `urgent`, `marketing_consent`, `transferred` (yes/no), `booked_for` (text, ISO time). Set the webhook to `APP_URL/api/retell/webhook`.
3. Twilio: buy an AU number per client (needs their ABN regulatory bundle), connect it to Retell, set the voice fallback URL to `/api/twilio/fallback` and the messaging webhook to `/api/twilio/sms`. Confirm at sign-up how the fallback works when Retell manages the number.
4. Vercel: deploy, add the variables from `.env.example`. The 10-minute cron needs the Pro plan (USD 20/mo); the free plan only runs it daily.

## Weekly cost report

Set `ADMIN_MOBILE` (where the report goes) and `ADMIN_FROM_NUMBER` (one of our Twilio numbers). The cost rates are estimates with defaults in `lib/env.ts`; update the `COST_PER_...` variables when the real prices are known from the Retell and Twilio billing pages. Run the tests with `npm test`.

## Not built yet

Tradie logins and the real dashboard, calendar availability for the AI to book against, Stripe billing, ServiceM8 sync, and alerting when something fails.
