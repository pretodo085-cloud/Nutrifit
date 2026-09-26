// NutriFit Premium — Cloudflare Worker + Hotmart
// Secrets (Cloudflare Worker > Settings > Variables and Secrets):
// HOTMART_CLIENT_ID
// HOTMART_CLIENT_SECRET
// NUTRIFIT_PRODUCT_ID
// HOTMART_HOTTOK
//
// Routes:
// GET  /health
// GET  /?transaction=HP...
// POST /webhook  (Hotmart Webhook V2)

const ALLOWED_ORIGIN = "*";
const APPROVED = new Set(["APPROVED", "COMPLETE"]);

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, X-HOTMART-HOTTOK",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    ...extra
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(), "Content-Type": "application/json; charset=utf-8" }
  });
}

function cleanTransaction(value) {
  return String(value || "").trim().toUpperCase();
}

async function hotmartAccessToken(env) {
  if (!env.HOTMART_CLIENT_ID || !env.HOTMART_CLIENT_SECRET) {
    throw new Error("Hotmart API credentials not configured");
  }

  const basic = btoa(env.HOTMART_CLIENT_ID + ":" + env.HOTMART_CLIENT_SECRET);
  const url =
    "https://api-sec-vlc.hotmart.com/security/oauth/token" +
    "?grant_type=client_credentials" +
    "&client_id=" + encodeURIComponent(env.HOTMART_CLIENT_ID) +
    "&client_secret=" + encodeURIComponent(env.HOTMART_CLIENT_SECRET);

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + basic,
      "Content-Type": "application/json"
    }
  });

  if (!r.ok) throw new Error("Hotmart authentication failed");
  const data = await r.json();
  if (!data.access_token) throw new Error("Hotmart access token not returned");
  return data.access_token;
}

async function verifyTransaction(transaction, env) {
  if (!/^HP[A-Z0-9]+$/.test(transaction)) {
    return { active: false, message: "Código de transação inválido." };
  }

  if (!env.NUTRIFIT_PRODUCT_ID) {
    throw new Error("NUTRIFIT_PRODUCT_ID not configured");
  }

  const token = await hotmartAccessToken(env);
  const url =
    "https://developers.hotmart.com/payments/api/v1/sales/history" +
    "?transaction=" + encodeURIComponent(transaction) +
    "&max_results=1";

  const r = await fetch(url, {
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  });

  if (!r.ok) throw new Error("Hotmart sales lookup failed");
  const data = await r.json();
  const item = Array.isArray(data.items) ? data.items[0] : null;

  if (!item || !item.purchase) {
    return { active: false, message: "Compra não encontrada." };
  }

  const productId = String(item.product?.id ?? "");
  const status = String(item.purchase.status ?? "").toUpperCase();

  if (productId !== String(env.NUTRIFIT_PRODUCT_ID)) {
    return { active: false, message: "Esta transação não pertence ao NutriFit." };
  }

  if (!APPROVED.has(status)) {
    return { active: false, status, message: "Pagamento ainda não está aprovado." };
  }

  return {
    active: true,
    status,
    transaction,
    product_id: productId,
    message: "Compra aprovada. Premium liberado."
  };
}

async function handleWebhook(request, env) {
  const hottok = request.headers.get("X-HOTMART-HOTTOK") || "";
  if (!env.HOTMART_HOTTOK || hottok !== env.HOTMART_HOTTOK) {
    return json({ ok: false, message: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "JSON inválido" }, 400);
  }

  const event = body?.event || "";
  const transaction = body?.data?.purchase?.transaction || "";
  const status = body?.data?.purchase?.status || "";

  // O webhook é aceito para manter a integração pronta para automações futuras.
  // A liberação efetiva do acesso é feita pela consulta segura da transação à API.
  return json({
    ok: true,
    received: true,
    event,
    transaction,
    status
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        ok: true,
        service: "NutriFit Premium",
        hotmart: Boolean(env.HOTMART_CLIENT_ID && env.HOTMART_CLIENT_SECRET && env.NUTRIFIT_PRODUCT_ID)
      });
    }

    if (url.pathname === "/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    if (request.method !== "GET") {
      return json({ active: false, message: "Método não permitido." }, 405);
    }

    const transaction = cleanTransaction(url.searchParams.get("transaction"));

    if (!transaction) {
      return json({
        active: false,
        service: "NutriFit Premium",
        message: "Informe ?transaction=HP..."
      }, 400);
    }

    try {
      return json(await verifyTransaction(transaction, env));
    } catch (error) {
      return json({
        active: false,
        message: "Servidor de validação não configurado ou indisponível."
      }, 503);
    }
  }
};