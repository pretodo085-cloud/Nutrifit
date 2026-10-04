// NutriFit Premium — Cloudflare Worker + Hotmart
// Secrets: HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET, NUTRIFIT_PRODUCT_ID, HOTMART_HOTTOK
// Routes: GET /?transaction=HP... | GET /health | POST /webhook/hotmart

const DEFAULT_PRODUCT_ID = "8588373";
const ALLOWED_ORIGIN = "*";

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, X-HOTMART-HOTTOK",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
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

async function getAccessToken(env) {
  if (!env.HOTMART_CLIENT_ID || !env.HOTMART_CLIENT_SECRET) {
    throw new Error("Hotmart credentials not configured");
  }

  const basic = btoa(env.HOTMART_CLIENT_ID + ":" + env.HOTMART_CLIENT_SECRET);
  const r = await fetch(
    "https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials",
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + basic,
        "Content-Type": "application/json"
      }
    }
  );

  if (!r.ok) throw new Error("Hotmart authentication failed");
  const data = await r.json();
  if (!data.access_token) throw new Error("Access token not returned");
  return data.access_token;
}

async function salesUsers(transaction, status, productId, token) {
  const qs = new URLSearchParams({
    transaction,
    transaction_status: status,
    product_id: productId,
    max_results: "50"
  });

  const r = await fetch(
    "https://developers.hotmart.com/payments/api/v1/sales/users?" + qs,
    {
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    }
  );

  if (!r.ok) throw new Error("Hotmart sales lookup failed: " + r.status);
  return r.json();
}

async function verifyTransaction(transaction, env) {
  if (!/^HP[A-Z0-9]+$/.test(transaction)) {
    return { active: false, message: "Código de transação inválido." };
  }

  const productId = String(env.NUTRIFIT_PRODUCT_ID || DEFAULT_PRODUCT_ID);
  const token = await getAccessToken(env);

  for (const status of ["APPROVED", "COMPLETE"]) {
    const data = await salesUsers(transaction, status, productId, token);
    const item = Array.isArray(data.items)
      ? data.items.find(x => cleanTransaction(x.transaction) === transaction)
      : null;

    if (item) {
      return {
        active: true,
        status,
        transaction,
        product_id: productId,
        message: "Compra aprovada. Premium liberado."
      };
    }
  }

  return {
    active: false,
    transaction,
    message: "Compra não confirmada ou acesso não está ativo."
  };
}

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handleWebhook(request, env) {
  const hottok = request.headers.get("X-HOTMART-HOTTOK") || "";

  if (!env.HOTMART_HOTTOK || !sameSecret(hottok, env.HOTMART_HOTTOK)) {
    return json({ ok: false, message: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "JSON inválido" }, 400);
  }

  const event = body?.event || "UNKNOWN";
  const transaction = body?.data?.purchase?.transaction || null;
  const productId =
    body?.data?.product?.id ??
    body?.data?.purchase?.product?.id ??
    null;

  console.log(JSON.stringify({ event, transaction, productId }));

  return json({ ok: true, received: true, event });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "NutriFit Premium",
        product_id: String(env.NUTRIFIT_PRODUCT_ID || DEFAULT_PRODUCT_ID),
        api_configured: Boolean(env.HOTMART_CLIENT_ID && env.HOTMART_CLIENT_SECRET)
      });
    }

    if (url.pathname === "/webhook/hotmart" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    if (url.pathname === "/" && request.method === "GET") {
      const transaction = cleanTransaction(url.searchParams.get("transaction"));

      if (!transaction) {
        return json({ ok: true, service: "NutriFit Premium", status: "online" });
      }

      try {
        return json(await verifyTransaction(transaction, env));
      } catch (error) {
        console.error(error);
        return json({
          active: false,
          message: "Servidor de validação indisponível."
        }, 503);
      }
    }

    return json({ ok: false, message: "Rota não encontrada." }, 404);
  }
};
