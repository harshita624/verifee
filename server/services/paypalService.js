/**
 * PayPal REST API v2 (Orders) — no SDK needed, just fetch.
 * Defaults to the free sandbox. Set PAYPAL_ENV=live for production.
 *
 * Network calls retry automatically. Node's built-in fetch gives up after a
 * 10 s connect timeout (ConnectTimeoutError), which happens on slow or
 * IPv6-first networks. Retrying is safe because every POST that moves money
 * carries a PayPal-Request-Id (idempotency key).
 */
const ENV = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
const BASE = ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let tokenCache = { value: null, expiresAt: 0 };

const isConfigured = () =>
  Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function httpError(status, message, paypal) {
  const err = new Error(message);
  err.statusCode = status;
  if (paypal) err.paypal = paypal;
  return err;
}

async function fetchWithRetry(url, options, { timeoutMs = 20_000, retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      const reason = err.cause?.code || err.code || err.name || err.message;
      console.warn(`PayPal network error (attempt ${attempt + 1}/${retries + 1}): ${reason}`);
      if (attempt < retries) await sleep(700 * (attempt + 1));
    }
  }
  throw httpError(
    504,
    "Could not reach PayPal. Check your internet connection and try again."
  );
}

async function getAccessToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.value;
  if (!isConfigured()) throw httpError(503, "PayPal is not configured on this server.");

  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetchWithRetry(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const responseText = await res.text().catch(() => "");
    let responseData = {};
    try { responseData = responseText ? JSON.parse(responseText) : {}; } catch { /* omit unstructured provider text */ }
    const issue = responseData.error_description || responseData.error || "PAYPAL_AUTH_FAILED";
    console.error("PayPal OAuth failed:", res.status, responseData.error || "unknown", responseData.error_description || "");
    throw httpError(
      502,
      "PayPal could not authenticate this server. Confirm PAYPAL_ENV and that the Client ID and Secret belong to the same PayPal app and environment.",
      { name: responseData.error || "PAYPAL_AUTH_FAILED", issue }
    );
  }

  const data = await res.json();
  tokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.value;
}

async function request(path, { method = "GET", body, requestId, extraHeaders = {} } = {}) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extraHeaders };
  if (process.env.PAYPAL_PARTNER_ATTRIBUTION_ID) headers["PayPal-Partner-Attribution-Id"] = process.env.PAYPAL_PARTNER_ATTRIBUTION_ID;
  // Idempotency: retrying the same request never double-charges.
  if (requestId) headers["PayPal-Request-Id"] = requestId;

  const res = await fetchWithRetry(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const detail = data.details?.[0];
    console.error("PayPal API error:", res.status, path, JSON.stringify(data).slice(0, 600));
    throw httpError(
      res.status === 422 ? 422 : 502,
      detail?.description || data.message || `PayPal request failed (${res.status})`,
      { name: data.name, issue: detail?.issue, debugId: data.debug_id }
    );
  }
  return data;
}

async function createOrder({ amount, currency, description, referenceId, customId, requestId, payeeMerchantId }) {
  const extraHeaders = payeeMerchantId
    ? { "PayPal-Auth-Assertion": authAssertion(payeeMerchantId) }
    : {};
  return request("/v2/checkout/orders", {
    method: "POST",
    requestId,
    extraHeaders,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          custom_id: customId,
          ...(payeeMerchantId ? { payee: { merchant_id: payeeMerchantId } } : {}),
          description: String(description).slice(0, 127),
          amount: { currency_code: currency, value: Number(amount).toFixed(2) },
        },
      ],
      application_context: {
        brand_name: "Verifee",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    },
  });
}


function authAssertion(merchantId) {
  const enc = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${enc({ alg: "none" })}.${enc({ iss: process.env.PAYPAL_CLIENT_ID, payer_id: merchantId })}.`;
}

async function createPartnerReferral({ trackingId, returnUrl, email, name }) {
  if (!process.env.PAYPAL_PARTNER_ID) throw httpError(503, "PayPal marketplace onboarding is not enabled. Configure partner credentials after PayPal approval.");
  const body = {
    tracking_id: trackingId,
    ...(email ? { email: { type: "CUSTOMER", address: email } } : {}),
    ...(name ? { name: { given_name: String(name).slice(0, 80) } } : {}),
    operations: [{ operation: "API_INTEGRATION", api_integration_preference: { rest_api_integration: {
      integration_method: "PAYPAL", integration_type: "THIRD_PARTY",
      third_party_details: { features: ["PAYMENT", "REFUND"] },
    } } }],
    products: ["EXPRESS_CHECKOUT"],
    legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
    partner_config_override: { return_url: returnUrl },
  };
  const result = await request("/v2/customer/partner-referrals", { method: "POST", body, extraHeaders: process.env.PAYPAL_PARTNER_ATTRIBUTION_ID ? { "PayPal-Partner-Attribution-Id": process.env.PAYPAL_PARTNER_ATTRIBUTION_ID } : {} });
  return { referralId: result.links?.find((x) => x.rel === "self")?.href?.split("/").pop(), actionUrl: result.links?.find((x) => x.rel === "action_url")?.href };
}

async function getSellerStatus(merchantId) {
  if (!process.env.PAYPAL_PARTNER_ID) throw httpError(503, "PayPal marketplace partner credentials are not configured.");
  const extraHeaders = { "PayPal-Auth-Assertion": authAssertion(merchantId) };
  if (process.env.PAYPAL_PARTNER_ATTRIBUTION_ID) extraHeaders["PayPal-Partner-Attribution-Id"] = process.env.PAYPAL_PARTNER_ATTRIBUTION_ID;
  return request(`/v1/customer/partners/${encodeURIComponent(process.env.PAYPAL_PARTNER_ID)}/merchant-integrations/${encodeURIComponent(merchantId)}`, { extraHeaders });
}

const captureOrder = (orderId, requestId, merchantId) =>
  request(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    body: {},
    requestId,
    extraHeaders: merchantId ? { "PayPal-Auth-Assertion": authAssertion(merchantId) } : {},
  });

const refundCapture = (captureId, requestId, merchantId) =>
  request(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: "POST", body: {}, requestId,
    extraHeaders: merchantId ? { "PayPal-Auth-Assertion": authAssertion(merchantId) } : {},
  });

const getOrder = (orderId, merchantId) => request(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
  extraHeaders: merchantId ? { "PayPal-Auth-Assertion": authAssertion(merchantId) } : {},
});

function extractCapture(order) {
  const cap = order?.purchase_units?.[0]?.payments?.captures?.[0];
  if (!cap) return null;
  return {
    id: cap.id,
    status: cap.status,
    value: Number(cap.amount?.value),
    currency: cap.amount?.currency_code,
    createTime: cap.create_time,
  };
}

// Verifies that a webhook really came from PayPal.
async function verifyWebhook(headers, event) {
  if (!process.env.PAYPAL_WEBHOOK_ID) return false;
  const data = await request("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    },
  });
  return data.verification_status === "SUCCESS";
}

module.exports = {
  ENV,
  isConfigured,
  createOrder,
  captureOrder,
  refundCapture,
  getOrder,
  extractCapture,
  verifyWebhook,
  createPartnerReferral,
  getSellerStatus,
};
