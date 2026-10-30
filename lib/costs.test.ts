import { test } from "node:test";
import assert from "node:assert/strict";
import { clientCosts, formatReport, segments } from "./costs";

const rates = { perMinuteUsd: 0.1, perTextUsd: 0.05, perNumberMonthUsd: 6, usdToAud: 1.5 };

test("counts SMS segments", () => {
  assert.equal(segments("hello"), 1);
  assert.equal(segments("a".repeat(160)), 1);
  assert.equal(segments("a".repeat(161)), 2);
  assert.equal(segments("Thanks! 👍"), 1);
  assert.equal(segments("👍" + "a".repeat(70)), 2);
});

test("works out cost per client, rounding each call up to the minute", () => {
  const costs = clientCosts(
    {
      businesses: [
        { id: "a", name: "Dave's Plumbing" },
        { id: "b", name: "Cool Air SA" },
      ],
      calls: [
        { business_id: "a", duration_seconds: 61 }, // 2 min
        { business_id: "a", duration_seconds: 120 }, // 2 min
        { business_id: "b", duration_seconds: null }, // 0 min
      ],
      texts: [
        { business_id: "a", body: "short" },
        { business_id: "a", body: "x".repeat(200) }, // 2 segments
      ],
      days: 7,
    },
    rates,
  );

  // Dave: 4 min * 0.10 + 3 texts * 0.05 + 6 * 7 / 30.44 = 0.40 + 0.15 + 1.3798 = 1.9298 USD -> 2.89 AUD
  assert.deepEqual(costs[0], { name: "Dave's Plumbing", calls: 2, minutes: 4, texts: 3, aud: 2.89 });
  // Cool Air: number rental only, 1.3798 USD -> 2.07 AUD
  assert.deepEqual(costs[1], { name: "Cool Air SA", calls: 1, minutes: 0, texts: 0, aud: 2.07 });
});

test("formats the report with a total", () => {
  const text = formatReport(
    [
      { name: "Dave's Plumbing", calls: 2, minutes: 4, texts: 3, aud: 2.89 },
      { name: "Cool Air SA", calls: 1, minutes: 0, texts: 0, aud: 2.07 },
    ],
    "20 Oct to 27 Oct",
  );
  assert.match(text, /Dave's Plumbing: 2 calls, 4 min, 3 texts, about \$2\.89/);
  assert.match(text, /Total: about \$4\.96/);
});

test("handles no clients", () => {
  assert.equal(formatReport([], "this week"), "Righto Booked costs this week: no active clients.");
});
