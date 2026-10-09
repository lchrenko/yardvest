import {
  corsHeaders,
  json,
  normalizeEmail,
  safeEqual,
  sha256,
} from "../_shared/core.js";
import { sendEmail } from "../_shared/email.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = corsHeaders(Deno.env.get("PUBLIC_SITE_ORIGIN") || "*");
  if (request.method === "OPTIONS")
    return new Response(null, { headers: cors });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405, cors);
  try {
    const input = await request.json();
    const action = input.action === "list" ? "list" : "send";
    const body = String(input.message || "").trim();
    if (action === "send" && (!body || body.length > 4000))
      return json(
        { error: "Enter a message under 4,000 characters" },
        422,
        cors,
      );
    const db = serviceClient();
    let conversationId = input.conversationId;
    let visitorToken = String(input.visitorToken || "");
    let email = normalizeEmail(input.email);
    if (!conversationId) {
      if (action === "list")
        return json({ error: "Conversation is required" }, 422, cors);
      if (!input.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return json(
          { error: "Name and a valid email are required" },
          422,
          cors,
        );
      const names = String(input.name).trim().split(/\s+/);
      const { data: contact, error: contactError } = await db
        .from("contacts")
        .upsert(
          {
            first_name: names[0],
            last_name: names.slice(1).join(" ") || "Chat",
            email,
          },
          { onConflict: "email" },
        )
        .select()
        .single();
      if (contactError) throw contactError;
      visitorToken = crypto.randomUUID();
      const { data: conversation, error } = await db
        .from("chat_conversations")
        .insert({
          contact_id: contact.id,
          source_page: input.page || "website",
          visitor_token_hash: await sha256(visitorToken),
        })
        .select()
        .single();
      if (error) throw error;
      conversationId = conversation.id;
    } else {
      const { data: conversation } = await db
        .from("chat_conversations")
        .select("visitor_token_hash,contacts(email)")
        .eq("id", conversationId)
        .single();
      if (
        !conversation ||
        !visitorToken ||
        !safeEqual(conversation.visitor_token_hash, await sha256(visitorToken))
      )
        return json({ error: "Chat session expired" }, 403, cors);
      email = conversation?.contacts?.email || email;
    }
    if (action === "list") {
      const { data: messages, error } = await db
        .from("chat_messages")
        .select("id,sender_type,body,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at");
      if (error) throw error;
      return json({ conversationId, messages }, 200, cors);
    }
    const { error } = await db
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "visitor",
        body,
      });
    if (error) throw error;
    await db
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
    const expertEmail = Deno.env.get("EXPERT_EMAIL");
    if (expertEmail) {
      try {
        await sendEmail({
          to: expertEmail,
          subject: "New YardVest live-chat message",
          html: `<p><strong>From:</strong> ${email}</p><p>${body.replaceAll("<", "&lt;")}</p>`,
        });
      } catch (mailError) {
        console.error(mailError);
      }
    }
    return json({ ok: true, conversationId, visitorToken }, 201, cors);
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to send chat message" }, 500, cors);
  }
});
