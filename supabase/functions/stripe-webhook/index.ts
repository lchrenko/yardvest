import { json, nextProjectStage, verifyStripeHeader } from "../_shared/core.js";
import { serviceClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/email.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return json({ error: "Webhook is not configured" }, 503);
  const payload = await request.text();
  if (!(await verifyStripeHeader(secret, payload, request.headers.get("stripe-signature"))))
    return json({ error: "Invalid signature" }, 400);
  try {
    const event = JSON.parse(payload);
    const db = serviceClient();
    const { error: eventError } = await db.from("webhook_events").insert({ id: event.id, provider: "stripe", event_type: event.type, payload: event });
    if (eventError?.code === "23505") return json({ received: true, duplicate: true });
    if (eventError) throw eventError;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = session.metadata?.payment_id;
      const { data: payment, error } = await db.from("payments").update({
        status: "paid", paid_at: new Date().toISOString(), stripe_payment_id: session.payment_intent || session.id,
      }).eq("id", paymentId).select("*,projects!inner(id,contact_id,contacts!inner(email))").single();
      if (error) throw error;
      const stage = nextProjectStage(payment.purpose);
      if (stage) {
        await db.from("projects").update({ stage, updated_at: new Date().toISOString() }).eq("id", payment.project_id);
        await db.from("pipeline_stage_history").insert({ project_id: payment.project_id, to_stage: stage });
      }
      await db.from("activities").insert({ project_id: payment.project_id, activity_type: "payment_received", metadata: { payment_id: payment.id, purpose: payment.purpose, stripe_event_id: event.id } });
      try { await sendEmail({ to: payment.projects.contacts.email, subject: "Your YardVest payment is confirmed", html: "<h1>Payment received</h1><p>Thank you. Your payment has been recorded against your YardVest project.</p>" }); } catch (error) { console.error("Receipt email failed", error); }
    }
    await db.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
    return json({ received: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
