# Righto Booked text message templates

*Drafted 22 Oct 2026. These are the texts the app sends. Keep each under 160 characters where possible (one SMS segment, cheaper). `{{...}}` fills in per job.*

**Two kinds of text, two sets of rules (Spam Act 2003):**
- **Service texts** (replies to the customer's own enquiry, booking confirmations, the tradie's job summary) are not marketing. They need the business name. An opt-out is good practice.
- **Marketing texts** (review requests, quote chasers, service reminders) need the customer's consent, the business name, and a working opt-out such as "Reply STOP". Consent is collected by the AI on the call ("Is it OK if we text you about this job and future services?") and stored against the customer.

The app must stop all marketing texts to a number that replies STOP, and record when.

## Service texts

| When | To | Text |
|---|---|---|
| Missed call, within 1 minute | Caller | Hi, it's {{business_name}}. Sorry we missed you, we're on a job. Reply with what you need and your suburb, and we'll get back to you today. |
| After an AI call that booked a visit | Caller | {{business_name}}: you're booked for {{day}} {{time}} at {{address}}. {{owner_first_name}} will text when on the way. Reply C to change. |
| After an AI call needing a call-back | Caller | {{business_name}}: thanks {{caller_name}}, we've got your details. {{owner_first_name}} will ring you {{callback_window}}. |
| After every AI call | Tradie | NEW JOB {{urgency_tag}}: {{caller_name}}, {{suburb}}. {{job_one_line}}. {{booking_or_callback}}. Call: {{caller_mobile}} |
| Urgent call, transfer failed | Tradie | URGENT: {{caller_name}} in {{suburb}}, {{job_one_line}}. Promised call-back in {{emergency_callback_minutes}} min. Call: {{caller_mobile}} |
| Day before a booking | Caller | {{business_name}}: reminder, {{owner_first_name}} is coming {{day}} {{time}}. Reply C to change. |

## Marketing texts (consent only, opt-out always)

| When | Text |
|---|---|
| Quote follow-up, day 2 | Hi {{caller_name}}, {{owner_first_name}} from {{business_name}}. Any questions on the quote for {{job_short}}? Happy to help. Reply STOP to opt out |
| Quote follow-up, day 7 | Hi {{caller_name}}, just checking in on your {{job_short}} quote. We can usually fit you in this week. Reply STOP to opt out |
| Review request, 2 hours after job marked done | Thanks for having us, {{caller_name}}! A quick Google review helps a local business heaps: {{review_link}} Reply STOP to opt out |
| Aircon service reminder, 11 months after last service (send Sep to Nov, before summer) | Hi {{caller_name}}, {{business_name}} here. Your aircon's due for its yearly service before summer hits. Book: {{booking_link}} Reply STOP to opt out |
| Hot water check, 12 months after a hot water job | Hi {{caller_name}}, {{business_name}} here. Time for a quick hot water system check? Book: {{booking_link}} Reply STOP to opt out |

## Replies the app understands

| Customer replies | App does |
|---|---|
| STOP, UNSUBSCRIBE, NO MORE | Marks the number opted out of marketing, sends one confirmation: "{{business_name}}: you won't get any more marketing texts from us." |
| C, CHANGE, RESCHEDULE | Texts the tradie to ring them, and replies "No worries, {{owner_first_name}} will be in touch to change the time." |
| Anything else | Forwards the text to the tradie and logs it on the customer's record |
