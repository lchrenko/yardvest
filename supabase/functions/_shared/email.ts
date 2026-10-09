export async function sendEmail(message: { to: string; subject: string; html: string; text?: string }) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) throw new Error("Email delivery is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, ...message }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return response.json();
}
