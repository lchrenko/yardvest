(function () {
  const launcher = document.querySelector("[data-chat-open]");
  const panel = document.querySelector("#live-chat");
  const close = document.querySelector("[data-chat-close]");
  const form = document.querySelector("[data-chat-form]");
  const messages = document.querySelector("[data-chat-messages]");
  const status = document.querySelector("[data-chat-status]");
  let conversationId = sessionStorage.getItem("yardvest_chat_id") || "";
  let visitorToken = sessionStorage.getItem("yardvest_chat_token") || "";
  let timer;

  function hideIdentity() {
    const identity = form.querySelector(".chat-identity");
    identity.hidden = true;
    identity
      .querySelectorAll("input")
      .forEach((input) => (input.disabled = true));
  }

  async function request(payload) {
    const config = window.YARDVEST_CONFIG || {};
    if (!config.functionsUrl)
      throw new Error(
        "Live chat is not connected yet. Please request an expert callback.",
      );
    const response = await fetch(`${config.functionsUrl}/chat-message`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: config.supabaseAnonKey || "",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Chat request failed");
    return result;
  }

  function render(items) {
    messages.replaceChildren();
    const welcome = document.createElement("p");
    welcome.className = "chat-system";
    welcome.textContent =
      "Hi—tell us about your property or ask a YardVest question. A real expert will reply here.";
    messages.append(welcome);
    items.forEach((item) => {
      const bubble = document.createElement("p");
      bubble.className =
        item.sender_type === "visitor" ? "chat-user" : "chat-system";
      bubble.textContent = item.body;
      messages.append(bubble);
    });
    messages.scrollTop = messages.scrollHeight;
  }

  async function refresh() {
    if (!conversationId || !visitorToken || panel.hidden) return;
    try {
      const result = await request({
        action: "list",
        conversationId,
        visitorToken,
      });
      render(result.messages || []);
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function toggle(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    clearInterval(timer);
    if (open) {
      form.querySelector(conversationId ? "textarea" : "input")?.focus();
      refresh();
      timer = setInterval(refresh, 8000);
    }
  }
  launcher.addEventListener("click", () => toggle(panel.hidden));
  close.addEventListener("click", () => toggle(false));
  if (conversationId && visitorToken) hideIdentity();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "Sending…";
    try {
      const result = await request({
        ...data,
        conversationId,
        visitorToken,
        page: location.hash || "home",
      });
      conversationId = result.conversationId;
      visitorToken = result.visitorToken || visitorToken;
      sessionStorage.setItem("yardvest_chat_id", conversationId);
      sessionStorage.setItem("yardvest_chat_token", visitorToken);
      form.querySelector("textarea").value = "";
      hideIdentity();
      status.textContent = "Message sent. Keep this window open for a reply.";
      await refresh();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
