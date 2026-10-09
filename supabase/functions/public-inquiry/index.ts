import { corsHeaders, json, normalizeEmail } from "../_shared/core.js";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = corsHeaders(Deno.env.get("PUBLIC_SITE_ORIGIN") || "*");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
  try {
    const input = await request.json();
    const db = serviceClient();
    if (input.type === "partner") {
      const required = ["name", "company", "email", "serviceArea", "partnerType"];
      if (required.some((key) => !String(input[key] || "").trim())) return json({ error: "Required fields are missing" }, 422, cors);
      const { error } = await db.from("partner_inquiries").insert({ name: input.name, company: input.company, email: normalizeEmail(input.email), phone: input.phone || null, website: input.website || null, service_area: input.serviceArea, partner_type: input.partnerType, message: input.message || null });
      if (error) throw error;
      return json({ ok: true }, 201, cors);
    }
    if (input.type !== "advisor") return json({ error: "Unknown inquiry type" }, 422, cors);
    if (!input.firstName || !input.lastName || !input.email || !input.phone) return json({ error: "Required fields are missing" }, 422, cors);
    const { data: contact, error: contactError } = await db.from("contacts").upsert({ first_name: input.firstName, last_name: input.lastName, email: normalizeEmail(input.email), phone: input.phone }, { onConflict: "email" }).select().single();
    if (contactError) throw contactError;
    let property = null;
    let project = null;
    if (input.propertyAddress) {
      const propertyResult = await db.from("properties").insert({ contact_id: contact.id, address_line: input.propertyAddress }).select().single();
      if (propertyResult.error) throw propertyResult.error;
      property = propertyResult.data;
      const projectResult = await db.from("projects").insert({ contact_id: contact.id, property_id: property.id, stage: "advisor_contact" }).select().single();
      if (projectResult.error) throw projectResult.error;
      project = projectResult.data;
    }
    const { error } = await db.from("advisor_requests").insert({ project_id: project?.id || null, contact_id: contact.id, property_id: property?.id || null, message: input.message || null, preferred_method: input.contactMethod || null, preferred_time: input.preferredTime || null });
    if (error) throw error;
    if (project) await db.from("tasks").insert({ project_id: project.id, task_type: "advisor_callback", title: "Respond to advisor request", status: "pending" });
    return json({ ok: true, projectId: project?.id || null }, 201, cors);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to submit inquiry" }, 500, cors);
  }
});
