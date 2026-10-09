import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import {
  assessHRMEligibility,
  nextProjectStage,
  normalizeEmail,
  stripeSignature,
  validateConsultation,
  validateLead,
  verifyStripeHeader,
} from "../supabase/functions/_shared/core.js";

test("HRM screening is preliminary and escalates uncertain constraints", () => {
  const promising = assessHRMEligibility({
    address: "10 Example Street, Halifax",
    locality: "Halifax",
    dwellingType: "single",
    existingSuite: "no",
    accessWidth: "yes",
    servicing: "municipal",
  });
  assert.equal(promising.status, "promising");
  assert.equal(
    assessHRMEligibility({
      address: "Halifax",
      dwellingType: "single",
      existingSuite: "yes",
      accessWidth: "unknown",
      servicing: "septic",
    }).status,
    "expert_review",
  );
});

test("lead validation normalizes email and requires property identity", () => {
  const result = validateLead({
    firstName: "Ana",
    lastName: "Lee",
    email: " ANA@EXAMPLE.COM ",
    address: "10 Main Street",
  });
  assert.equal(result.valid, true);
  assert.equal(result.value.email, "ana@example.com");
  assert.equal(normalizeEmail(" Test@Example.com "), "test@example.com");
  assert.equal(validateLead({ email: "bad" }).valid, false);
});

test("consultation validation enforces project, advisor, time and duration", () => {
  assert.equal(
    validateConsultation({
      projectId: "p",
      advisorId: "a",
      startsAt: "2030-01-01T18:00:00Z",
      durationMinutes: 30,
    }).valid,
    true,
  );
  assert.equal(validateConsultation({ durationMinutes: 5 }).valid, false);
});

test("payment purpose advances to the correct Project OS stage", () => {
  assert.equal(nextProjectStage("reservation"), "reservation");
  assert.equal(nextProjectStage("deposit"), "deposit_paid");
  assert.equal(nextProjectStage("other"), null);
});

test("Stripe webhook signatures are verified and stale signatures rejected", async () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ id: "evt_test" });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await stripeSignature(secret, payload, timestamp);
  assert.equal(
    await verifyStripeHeader(secret, payload, `t=${timestamp},v1=${signature}`),
    true,
  );
  assert.equal(
    await verifyStripeHeader(
      secret,
      `${payload}x`,
      `t=${timestamp},v1=${signature}`,
    ),
    false,
  );
  assert.equal(
    await verifyStripeHeader(
      secret,
      payload,
      `t=${timestamp - 600},v1=${signature}`,
    ),
    false,
  );
});

test("every public product asset referenced by app.js exists", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const paths = [
    ...app.matchAll(
      /assets\/(?:yardvest-one|yardvest-two|suite-plus)\/[A-Za-z0-9_./-]+\.png/g,
    ),
  ].map((match) => match[0]);
  assert.ok(paths.length >= 30);
  await Promise.all(
    [...new Set(paths)].map((path) =>
      access(new URL(`../${path}`, import.meta.url)),
    ),
  );
});

test("production intake does not persist lead data in localStorage", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.equal(app.includes("yardvest_leads"), false);
  assert.equal(app.includes("localStorage.setItem"), false);
});
