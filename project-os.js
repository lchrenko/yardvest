const osConfig = () => window.YARDVEST_CONFIG || {};
const sessionKey = "yardvest_session";
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey) || "null");
  } catch {
    return null;
  }
}

async function api(path, options = {}) {
  const config = osConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey)
    throw new Error("The Project OS deployment is not connected yet.");
  const session = getSession();
  const response = await fetch(`${config.supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: config.supabaseAnonKey,
      "content-type": "application/json",
      ...(session?.access_token
        ? { authorization: `Bearer ${session.access_token}` }
        : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      body.error_description || body.message || body.error || "Request failed",
    );
  return body;
}

async function signIn(form) {
  const data = Object.fromEntries(new FormData(form));
  const session = await api("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify(data),
  });
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

async function loadPortal(root) {
  const projects = await api(
    "/rest/v1/projects?select=id,stage,estimated_rent_low,estimated_rent_high,properties(address_line),product_families(name),consultations(starts_at,status),property_reviews(result,customer_summary),reservations(id,status,amount,currency),proposals(id,status,base_amount,currency),contracts(id,status),payments(id,purpose,amount,currency,status,due_at)&order=updated_at.desc",
  );
  if (!projects.length) {
    root.innerHTML =
      '<div class="os-empty"><h2>No active YardVest project yet.</h2><p>Complete a property check and ask your advisor to connect it to this account.</p></div>';
    return;
  }
  const p = projects[0];
  root.innerHTML = `<div class="os-dashboard"><div class="os-summary"><span class="eyebrow">CURRENT STAGE</span><h2>${String(p.stage).replaceAll("_", " ")}</h2><p>${p.properties?.address_line || "Property address pending"}</p><p>${p.product_families?.name || "Product recommendation pending"}</p></div><div class="os-cards">${[
    [
      "Consultation",
      p.consultations?.[0]?.starts_at
        ? new Date(p.consultations[0].starts_at).toLocaleString()
        : "Not booked",
    ],
    ["Property review", p.property_reviews?.[0]?.result || "In progress"],
    ["Reservation", p.reservations?.[0]?.status || "Not ready"],
    ["Proposal", p.proposals?.[0]?.status || "Not ready"],
    ["Contract", p.contracts?.[0]?.status || "Not ready"],
    [
      "Next payment",
      p.payments?.find((x) => x.status !== "paid")
        ? `${p.payments.find((x) => x.status !== "paid").currency} ${p.payments.find((x) => x.status !== "paid").amount}`
        : "Nothing due",
    ],
  ]
    .map(
      ([label, value]) =>
        `<article class="os-card"><span>${label}</span><strong>${value}</strong></article>`,
    )
    .join("")}</div>${
    p.payments
      ?.filter((x) => x.status !== "paid")
      .map(
        (payment) =>
          `<button class="button button-dark" data-pay="${payment.id}">Pay ${payment.purpose}</button>`,
      )
      .join("") || ""
  }</div>`;
  root.querySelectorAll("[data-pay]").forEach(
    (button) =>
      (button.onclick = async () => {
        button.disabled = true;
        try {
          const config = osConfig();
          const session = getSession();
          const response = await fetch(
            `${config.functionsUrl}/create-checkout`,
            {
              method: "POST",
              headers: {
                apikey: config.supabaseAnonKey,
                authorization: `Bearer ${session.access_token}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({ paymentId: button.dataset.pay }),
            },
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          location.href = result.checkoutUrl;
        } catch (error) {
          button.disabled = false;
          root.insertAdjacentHTML(
            "afterbegin",
            `<p class="os-error">${error.message}</p>`,
          );
        }
      }),
  );
}

async function loadAdmin(root) {
  const [projects, tasks, consultations, chats] = await Promise.all([
    api(
      "/rest/v1/projects?select=id,stage,updated_at,contacts(first_name,last_name,email),properties(address_line)&order=updated_at.desc&limit=50",
    ),
    api(
      "/rest/v1/tasks?select=id,title,status,due_at,project_id&status=neq.complete&order=due_at.asc.nullslast&limit=20",
    ),
    api(
      "/rest/v1/consultations?select=id,starts_at,status,project_id&starts_at=gte.now()&order=starts_at.asc&limit=20",
    ),
    api(
      "/rest/v1/chat_conversations?select=id,status,last_message_at,contacts(first_name,last_name,email),chat_messages(id,sender_type,body,created_at)&order=last_message_at.desc&limit=10",
    ),
  ]);
  const count = (stage) =>
    projects.filter((p) => stage.includes(p.stage)).length;
  root.innerHTML = `<div class="os-dashboard"><div class="os-cards">${[
    ["New leads", count(["new_lead"])],
    ["Reviews due", count(["property_review"])],
    ["Reservations", count(["reservation"])],
    ["Contracts", count(["contract_sent"])],
    ["Deposits due", count(["deposit_due"])],
    [
      "Active projects",
      count([
        "design_engineering",
        "permits",
        "pre_construction",
        "construction",
        "inspections",
      ]),
    ],
  ]
    .map(
      ([l, v]) =>
        `<article class="os-card"><span>${l}</span><strong>${v}</strong></article>`,
    )
    .join(
      "",
    )}</div><div class="os-columns"><section><h2>Pipeline</h2>${projects.map((p) => `<article class="os-row"><strong>${escapeHtml(p.contacts?.first_name || "Lead")} ${escapeHtml(p.contacts?.last_name || "")}</strong><span>${escapeHtml(p.properties?.address_line || "Address pending")}</span><em>${p.stage.replaceAll("_", " ")}</em></article>`).join("")}</section><section><h2>Tasks & consultations</h2>${tasks.map((t) => `<article class="os-row"><strong>${escapeHtml(t.title)}</strong><span>${t.due_at ? new Date(t.due_at).toLocaleDateString() : "No due date"}</span></article>`).join("")}${consultations.map((c) => `<article class="os-row"><strong>Consultation</strong><span>${new Date(c.starts_at).toLocaleString()}</span></article>`).join("")}</section></div><section class="os-chat-queue"><h2>Live chat</h2>${
    chats.length
      ? chats
          .map((chat) => {
            const ordered = [...(chat.chat_messages || [])].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
            return `<article class="os-chat-thread"><header><strong>${escapeHtml(chat.contacts?.first_name || "Visitor")} ${escapeHtml(chat.contacts?.last_name || "")}</strong><span>${escapeHtml(chat.contacts?.email || "")}</span></header><div>${ordered.map((message) => `<p class="${message.sender_type === "visitor" ? "visitor" : "expert"}"><b>${message.sender_type === "visitor" ? "Visitor" : "YardVest"}</b>${escapeHtml(message.body)}</p>`).join("")}</div><form data-chat-reply="${chat.id}"><input name="body" required maxlength="4000" placeholder="Reply as YardVest"><button class="button button-dark" type="submit">Send reply</button></form></article>`;
          })
          .join("")
      : "<p>No chat conversations yet.</p>"
  }</section></div>`;
  root.querySelectorAll("[data-chat-reply]").forEach((form) => {
    form.onsubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        await api("/rest/v1/chat_messages", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            conversation_id: form.dataset.chatReply,
            sender_type: "expert",
            body: new FormData(form).get("body"),
          }),
        });
        await api(
          `/rest/v1/chat_conversations?id=eq.${form.dataset.chatReply}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ last_message_at: new Date().toISOString() }),
          },
        );
        await loadAdmin(root);
      } catch (error) {
        button.disabled = false;
        form.insertAdjacentHTML(
          "beforebegin",
          `<p class="os-error">${error.message}</p>`,
        );
      }
    };
  });
}

export function bindProjectOS() {
  const form = document.querySelector("[data-os-login]");
  const root = document.querySelector("[data-os-root]");
  if (!root) return;
  const mode = root.dataset.osRoot;
  const run = () =>
    (mode === "admin" ? loadAdmin(root) : loadPortal(root)).catch((error) => {
      root.innerHTML = `<p class="os-error">${error.message}</p>`;
    });
  if (getSession()) run();
  if (form)
    form.onsubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        await signIn(form);
        form.remove();
        await run();
      } catch (error) {
        button.disabled = false;
        form.querySelector("[data-login-error]").textContent = error.message;
      }
    };
}

window.bindProjectOS = bindProjectOS;
if (document.querySelector("[data-os-root]")) bindProjectOS();
