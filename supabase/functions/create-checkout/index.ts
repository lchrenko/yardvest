import { corsHeaders, json } from "../_shared/core.js";
import { requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = corsHeaders(Deno.env.get("PUBLIC_SITE_ORIGIN") || "*");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL");
    if (!stripeKey || !siteUrl) throw new Error("Stripe is not configured");
    const { client, user } = await requireUser(request);
    const { paymentId } = await request.json();
    const { data: payment, error } = await client.from("payments")
      .select("id,project_id,purpose,amount,currency,status,projects!inner(contact_id,contacts!inner(user_id,email))")
      .eq("id", paymentId).single();
    if (error || !payment) return json({ error: "Payment not found" }, 404, cors);
    const owner = payment.projects.contacts;
    if (owner.user_id !== user.id) return json({ error: "Forbidden" }, 403, cors);
    if (payment.status === "paid") return json({ error: "Payment is already complete" }, 409, cors);
    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${siteUrl}/#/portal?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#/portal?payment=cancelled`,
      customer_email: owner.email,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": payment.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(Math.round(Number(payment.amount) * 100)),
      "line_items[0][price_data][product_data][name]": payment.purpose === "deposit" ? "YardVest project deposit" : "YardVest reservation",
      "metadata[payment_id]": payment.id,
      "metadata[project_id]": payment.project_id,
      "metadata[purpose]": payment.purpose,
    });
    const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST", headers: { authorization: `Bearer ${stripeKey}`, "content-type": "application/x-www-form-urlencoded" }, body: params,
    });
    const session = await stripe.json();
    if (!stripe.ok) throw new Error(session?.error?.message || "Stripe checkout failed");
    await client.from("payments").update({ stripe_payment_id: session.payment_intent || session.id, status: "checkout_created" }).eq("id", payment.id);
    return json({ ok: true, checkoutUrl: session.url }, 200, cors);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unable to create checkout" }, 500, cors);
  }
});
