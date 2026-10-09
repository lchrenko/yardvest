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
