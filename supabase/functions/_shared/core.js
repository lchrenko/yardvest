export const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });

export const corsHeaders = (origin = "*") => ({
  "access-control-allow-origin": origin,
  "access-control-allow-headers":
    "authorization, apikey, content-type, stripe-signature",
  "access-control-allow-methods": "POST, OPTIONS",
});

export async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(value || "")),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function validateLead(input) {
  const value = input && typeof input === "object" ? input : {};
  const errors = [];
  const email = normalizeEmail(value.email);
  if (!String(value.firstName || "").trim())
    errors.push("firstName is required");
  if (!String(value.lastName || "").trim()) errors.push("lastName is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("email is invalid");
  if (!String(value.address || "").trim()) errors.push("address is required");
  return { valid: errors.length === 0, errors, value: { ...value, email } };
}

export function validateConsultation(input) {
  const startsAt = new Date(input?.startsAt || "");
  const duration = Number(input?.durationMinutes || 30);
  const errors = [];
  if (!input?.projectId) errors.push("projectId is required");
  if (!input?.advisorId) errors.push("advisorId is required");
  if (Number.isNaN(startsAt.getTime())) errors.push("startsAt is invalid");
  if (!Number.isInteger(duration) || duration < 15 || duration > 180)
    errors.push("durationMinutes must be between 15 and 180");
  return { valid: errors.length === 0, errors, startsAt, duration };
}

export function nextProjectStage(purpose) {
  if (purpose === "reservation") return "reservation";
  if (purpose === "deposit") return "deposit_paid";
  return null;
}

export function assessHRMEligibility(input) {
  const notes = [];
  let status = "promising";
  const address = String(input?.address || "").toLowerCase();
  const locality = String(input?.locality || "").toLowerCase();
  const inHRM =
    /halifax|dartmouth|bedford|sackville|cole harbour|timberlea|tantallon|fall river|hammonds plains|spryfield/.test(
      `${address} ${locality}`,
    );
  if (!inHRM) {
    status = "outside_hrm_scope";
    notes.push(
      "The address was not confirmed as being in Halifax Regional Municipality.",
    );
  }
  const eligibleDwellings = new Set([
    "single",
    "semi",
    "duplex",
    "row",
    "apartment3",
  ]);
  if (!eligibleDwellings.has(input?.dwellingType)) {
    status = status === "outside_hrm_scope" ? status : "expert_review";
    notes.push(
      "The existing dwelling type needs confirmation against the applicable land-use by-law.",
    );
  }
  if (input?.existingSuite === "yes") {
    status = "expert_review";
    notes.push(
      "HRM generally limits a lot to one secondary, garden or backyard suite; the existing unit must be reviewed.",
    );
  } else if (input?.existingSuite !== "no") {
    status = status === "promising" ? "expert_review" : status;
    notes.push("Existing auxiliary dwelling status needs confirmation.");
  }
  if (input?.accessWidth !== "yes") {
    status = status === "promising" ? "expert_review" : status;
    notes.push(
      "HRM requires an unobstructed same-lot route to the street or applicable driveway, generally at least 1.1 m wide.",
    );
  }
  if (input?.servicing === "septic") {
    status = status === "promising" ? "expert_review" : status;
    notes.push(
      "On-site sewage capacity and provincial acceptance must be confirmed.",
    );
  } else if (!input?.servicing || input.servicing === "unknown") {
    status = status === "promising" ? "expert_review" : status;
    notes.push("Water and wastewater servicing must be confirmed.");
  }
  if (status === "promising")
    notes.push(
      "The initial answers align with several common HRM backyard-suite criteria, subject to zoning, setbacks, lot coverage, servicing, code and permits.",
    );
  return { status, notes, jurisdiction: inHRM ? "HRM" : "unconfirmed" };
}

export async function stripeSignature(secret, payload, timestamp) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  return [...new Uint8Array(signed)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1)
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function verifyStripeHeader(
  secret,
  payload,
  header,
  now = Date.now(),
) {
  const values = Object.fromEntries(
    String(header || "")
      .split(",")
      .map((part) => part.split("=", 2)),
  );
  const timestamp = Number(values.t);
  if (!timestamp || Math.abs(now / 1000 - timestamp) > 300) return false;
  const expected = await stripeSignature(secret, payload, timestamp);
  return safeEqual(expected, values.v1);
}
