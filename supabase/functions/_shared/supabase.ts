import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server configuration is missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function requireUser(request: Request) {
  const client = serviceClient();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid authentication");
  return { client, user: data.user };
}
