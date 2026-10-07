// Vercel Serverless API Proxy - cổng dữ liệu báo cáo
// Trình duyệt chỉ gọi endpoint cùng tên miền: /api/reports
//
// Biến môi trường (Vercel → Settings → Environment Variables):
// - SHEETS_BACKEND_URL: URL Web App Apps Script (ưu tiên dùng; giá trị mặc định bên dưới chỉ để dự phòng)
// - ALLOWED_ORIGIN: các tên miền khác được phép gọi, cách nhau dấu phẩy (vd "https://chude9to4.vercel.app").
//   Không đặt -> chỉ cho phép gọi từ chính tên miền của site (an toàn mặc định).

const DEFAULT_BACKEND = "https://script.google.com/macros/s/AKfycbyaYe5lkRtG3PmE_hn_a4OlXrVRBAD3ZGyaM9EmEjEKiBJCMh8XiHLSnpQY5ckRntX6dQ/exec";
const BACKEND_ENDPOINT = (process.env.SHEETS_BACKEND_URL || "").trim() || DEFAULT_BACKEND;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(s => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const ALLOWED_GET_ACTIONS = ["getAll"];
const MAX_BODY_BYTES = 8 * 1024;
const UPSTREAM_TIMEOUT_MS = 12000;

// Origin hợp lệ: cùng tên miền với request, hoặc nằm trong ALLOWED_ORIGIN
function isAllowedOrigin(origin, host) {
  if (!origin) return true; // không có Origin: request cùng trang (GET) hoặc không phải trình duyệt
  try {
    if (host && new URL(origin).host === host) return true;
  } catch (e) {
    return false;
  }
  return ALLOWED_ORIGINS.includes(origin.replace(/\/+$/, ""));
}

async function fetchUpstream(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: ctrl.signal });
    // Apps Script lỗi / sai URL trả về trang HTML -> coi là lỗi cổng
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Origin");

  if (!isAllowedOrigin(origin, host)) {
    return res.status(403).json({ success: false, error: "Origin not allowed" });
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.method === "GET") {
      const action = String((req.query && req.query.action) || "getAll");
      if (!ALLOWED_GET_ACTIONS.includes(action)) {
        return res.status(400).json({ success: false, error: "Unsupported action" });
      }
      const data = await fetchUpstream(`${BACKEND_ENDPOINT}?action=${encodeURIComponent(action)}`, { method: "GET" });
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
      if (Buffer.byteLength(payload, "utf8") > MAX_BODY_BYTES) {
        return res.status(413).json({ success: false, error: "Payload too large" });
      }
      const data = await fetchUpstream(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: payload
      });
      return res.status(200).json(data);
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  } catch (error) {
    return res.status(502).json({ success: false, error: "Gateway Error" });
  }
};
