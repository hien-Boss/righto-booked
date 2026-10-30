// Estimates what each tradie client cost us over a period, from our own
// records of calls and texts. These are estimates: the Retell and Twilio
// billing pages are the real numbers.

export type Rates = {
  perMinuteUsd: number; // Retell voice plus Twilio call carriage
  perTextUsd: number; // per SMS segment
  perNumberMonthUsd: number; // phone number rental
  usdToAud: number;
};

export type CostInput = {
  businesses: { id: string; name: string }[];
  calls: { business_id: string; duration_seconds: number | null }[];
  texts: { business_id: string; body: string }[];
  days: number;
};

export type ClientCost = {
  name: string;
  calls: number;
  minutes: number;
  texts: number;
  aud: number;
};

const AVG_DAYS_PER_MONTH = 30.44;

// A text over 160 plain characters is billed as several segments of 153.
// Emoji or other special characters drop that to 70 and 67.
export function segments(body: string): number {
  const plain = /^[\x20-\x7E\n\r]*$/.test(body);
  const single = plain ? 160 : 70;
  const multi = plain ? 153 : 67;
  return body.length <= single ? 1 : Math.ceil(body.length / multi);
}

export function clientCosts(input: CostInput, rates: Rates): ClientCost[] {
  const numberUsd = (rates.perNumberMonthUsd * input.days) / AVG_DAYS_PER_MONTH;

  return input.businesses
    .map((business) => {
      const calls = input.calls.filter((c) => c.business_id === business.id);
      const texts = input.texts.filter((t) => t.business_id === business.id);
      // Voice is billed per minute or part of one, so round each call up.
      const minutes = calls.reduce((sum, c) => sum + Math.ceil((c.duration_seconds ?? 0) / 60), 0);
      const textSegments = texts.reduce((sum, t) => sum + segments(t.body), 0);
      const usd = minutes * rates.perMinuteUsd + textSegments * rates.perTextUsd + numberUsd;
      return {
        name: business.name,
        calls: calls.length,
        minutes,
        texts: textSegments,
        aud: Math.round(usd * rates.usdToAud * 100) / 100,
      };
    })
    .sort((a, b) => b.aud - a.aud);
}

export function formatReport(costs: ClientCost[], periodLabel: string): string {
  if (costs.length === 0) return `Righto Booked costs ${periodLabel}: no active clients.`;
  const total = costs.reduce((sum, c) => sum + c.aud, 0);
  const lines = costs.map(
    (c) => `${c.name}: ${c.calls} calls, ${c.minutes} min, ${c.texts} texts, about $${c.aud.toFixed(2)}`,
  );
  return [
    `Righto Booked costs ${periodLabel} (AUD, estimate)`,
    ...lines,
    `Total: about $${total.toFixed(2)}`,
    "Check exact figures on the Retell and Twilio billing pages.",
  ].join("\n");
}
