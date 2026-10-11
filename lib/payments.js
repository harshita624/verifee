
export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("vf_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Calls /api/v1<path>. Returns `data.data` and throws an Error carrying
 * `.status` and `.code` (e.g. 402 / "UPGRADE_REQUIRED") on failure.
 */
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const res = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(auth ? authHeaders() : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || data?.success === false) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data?.data ?? data;
}

// ── UPI helpers ──────────────────────────────────────────────────────────────

const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export const isValidVpa = (v) => VPA_RE.test((v || "").trim());

/** Parses a upi://pay?... string (what a vendor's QR code contains). */
export function parseUpiUri(text) {
  if (!text || !/^upi:\/\/pay/i.test(text.trim())) return null;
  try {
    const url = new URL(text.trim().replace(/^upi:\/\//i, "https://upi.local/"));
    const p = url.searchParams;
    const pa = (p.get("pa") || "").trim();
    if (!isValidVpa(pa)) return null;
    const am = parseFloat(p.get("am"));
    return {
      pa,
      pn: p.get("pn") || "",
      am: Number.isFinite(am) && am > 0 ? am : null,
      tn: p.get("tn") || "",
    };
  } catch {
    return null;
  }
}

/** Builds the upi://pay deep link that any UPI app (GPay, PhonePe, Paytm…) understands. */
export function buildUpiUri({ pa, pn, am, tn, tr }) {
  const enc = encodeURIComponent;
  let s = `upi://pay?pa=${pa}`;
  if (pn) s += `&pn=${enc(pn.slice(0, 40))}`;
  if (am) s += `&am=${Number(am).toFixed(2)}`;
  s += "&cu=INR";
  if (tn) s += `&tn=${enc(tn.slice(0, 60))}`;
  if (tr) s += `&tr=${enc(tr)}`;
  return s;
}

export const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;