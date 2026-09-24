// NutriFit Premium — Cloudflare Worker + KV
// Configure:
// 1) HOTMART_TOKEN = token secreto do Webhook configurado na Hotmart
// 2) PRODUCT_ID = ID do produto NutriFit (8588373)
// 3) PREMIUM_KV = KV namespace binding
//
// Rotas:
// POST /hotmart-webhook  -> recebe eventos da Hotmart
// GET  /premium-status?transaction=HP... -> consulta acesso
//
// A chave da KV é a transação da Hotmart. O Worker nunca deve aceitar
// uma ativação enviada pelo navegador.

const PRODUCT_ID = "8588373";
const ACTIVE_EVENTS = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);
const INACTIVE_EVENTS = new Set([
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_CANCELED",
  "PURCHASE_CANCELLED",
  "PURCHASE_EXPIRED"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,x-hotmart-hottok"
    }
  });
}

function eventName(body) {
  return String(
    body?.event ||
    body?.data?.event ||
    body?.purchase?.event ||
    ""
  ).toUpperCase();
}

function transactionOf(body) {
  return String(
    body?.data?.purchase?.transaction ||
    body?.data?.purchase?.transaction_id ||
    body?.purchase?.transaction ||
    body?.transaction ||
    ""
  ).trim();
}

function productIdOf(body) {
  return String(
    body?.data?.product?.id ||
    body?.product?.id ||
    ""
  ).trim();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, {status:204, headers:{
      "access-control-allow-origin":"*",
      "access-control-allow-methods":"GET,POST,OPTIONS",
      "access-control-allow-headers":"content-type,x-hotmart-hottok"
    }});

    const url = new URL(request.url);

    if (url.pathname === "/premium-status" && request.method === "GET") {
      const tx = (url.searchParams.get("transaction") || "").trim();
      if (!/^HP[A-Za-z0-9]+$/.test(tx)) return json({active:false,message:"Transação inválida."},400);
      const value = await env.PREMIUM_KV.get("tx:"+tx);
      if (!value) return json({active:false,message:"Compra não confirmada."},404);
      const record = JSON.parse(value);
      return json({active: record.active === true});
    }

    if (url.pathname === "/hotmart-webhook" && request.method === "POST") {
      const token = request.headers.get("x-hotmart-hottok") || request.headers.get("X-Hotmart-Hottok") || "";
      if (!env.HOTMART_TOKEN || token !== env.HOTMART_TOKEN) return json({error:"unauthorized"},401);

      let body;
      try { body = await request.json(); } catch { return json({error:"invalid_json"},400); }

      const tx = transactionOf(body);
      const event = eventName(body);
      const product = productIdOf(body);

      if (!tx) return json({error:"transaction_missing"},400);
      if (product && product !== PRODUCT_ID) return json({ignored:true,reason:"product"});

      if (ACTIVE_EVENTS.has(event)) {
        await env.PREMIUM_KV.put("tx:"+tx, JSON.stringify({
          active:true, event, product:product || PRODUCT_ID, updatedAt:Date.now()
        }));
      } else if (INACTIVE_EVENTS.has(event)) {
        await env.PREMIUM_KV.put("tx:"+tx, JSON.stringify({
          active:false, event, product:product || PRODUCT_ID, updatedAt:Date.now()
        }));
      }

      return json({ok:true});
    }

    return json({service:"NutriFit Premium",status:"online"});
  }
};