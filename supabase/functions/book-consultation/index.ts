import { corsHeaders, json, validateConsultation } from "../_shared/core.js";
import { requireUser } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/email.ts";

Deno.serve(async (request) => {
  const cors = corsHeaders(Deno.env.get("PUBLIC_SITE_ORIGIN") || "*");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
  try {
    const input = await request.json();
    const checked = validateConsultation(input);
    if (!checked.valid) return json({ error: "Invalid booking", fields: checked.errors }, 422, cors);
    const { client, user } = await requireUser(request);
    const { data: project } = await client.from("projects").select("id,contacts!inner(user_id,email)").eq("id", input.projectId).single();
    if (!project || project.contacts.user_id !== user.id) return json({ error: "Forbidden" }, 403, cors);
    const endsAt = new Date(checked.startsAt.getTime() + checked.duration * 60000);
    const { data: consultation, error } = await client.from("consultations").insert({
      project_id: input.projectId, advisor_id: input.advisorId, starts_at: checked.startsAt.toISOString(),
      ends_at: endsAt.toISOString(), timezone: input.timezone || "America/Vancouver", status: "pending",
    }).select().single();
    if (error?.code === "23505") return json({ error: "That time is no longer available" }, 409, cors);
    if (error) throw error;
    await Promise.all([
      client.from("projects").update({ stage: "consultation_booked", updated_at: new Date().toISOString() }).eq("id", input.projectId),
      client.from("activities").insert({ project_id: input.projectId, activity_type: "consultation_booked", metadata: { consultation_id: consultation.id } }),
    ]);
    try { await sendEmail({ to: project.contacts.email, subject: "Your YardVest consultation is confirmed", html: `<h1>Consultation confirmed</h1><p>${checked.startsAt.toLocaleString("en-CA", { timeZone: input.timezone || "America/Vancouver" })}</p>` }); } catch (error) { console.error("Booking email failed", error); }
    return json({ ok: true, consultation }, 201, cors);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to book consultation" }, 500, cors);
  }
});
