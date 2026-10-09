import { corsHeaders, json, validateLead } from "../_shared/core.js";
import { serviceClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/email.ts";

Deno.serve(async (request) => {
  const cors = corsHeaders(Deno.env.get("PUBLIC_SITE_ORIGIN") || "*");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
  try {
    const checked = validateLead(await request.json());
    if (!checked.valid) return json({ error: "Invalid submission", fields: checked.errors }, 422, cors);
    const input = checked.value;
    const db = serviceClient();
    const { data: contact, error: contactError } = await db.from("contacts").upsert({
      first_name: input.firstName.trim(), last_name: input.lastName.trim(), email: input.email,
      phone: input.phone?.trim() || null,
    }, { onConflict: "email" }).select().single();
    if (contactError) throw contactError;
    const { data: property, error: propertyError } = await db.from("properties").insert({
      contact_id: contact.id, address_line: input.address.trim(), notes: input.notes?.trim() || null,
    }).select().single();
    if (propertyError) throw propertyError;
    const { data: lead, error: leadError } = await db.from("leads").insert({
      contact_id: contact.id, property_id: property.id, source: input.source || "website",
      goal: input.goal || null,
    }).select().single();
    if (leadError) throw leadError;
    const { data: project, error: projectError } = await db.from("projects").insert({
      contact_id: contact.id, property_id: property.id, lead_id: lead.id, stage: "new_lead",
    }).select().single();
    if (projectError) throw projectError;
    await Promise.all([
      db.from("tasks").insert({ project_id: project.id, task_type: "property_review", title: "Complete preliminary property review", status: "pending" }),
      db.from("activities").insert({ project_id: project.id, activity_type: "property_check_submitted", metadata: { source: input.source || "website" } }),
    ]);
    try { await sendEmail({ to: input.email, subject: "We received your YardVest property", html: "<h1>Your property review has started</h1><p>A YardVest Advisor will review what may fit and the next best step.</p>" }); } catch (error) { console.error("Confirmation email failed", error); }
    return json({ ok: true, projectId: project.id, next: "property_review" }, 201, cors);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to create property review" }, 500, cors);
  }
});
