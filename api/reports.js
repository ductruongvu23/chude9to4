// Vercel Serverless API Proxy - Data Security Gateway
// Giấu hoàn toàn địa chỉ backend Google Apps Script khỏi DevTools/F12 của trình duyệt.
// Trình duyệt chỉ thấy endpoint nội bộ: /api/reports

const BACKEND_ENDPOINT = process.env.SHEETS_BACKEND_URL || 
  Buffer.from("aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5YVNlNWxrUnRHM1BtRV9obl9hNE9sWHJWUkJBRDNaR3lhTTlFbUVqRUtpQkpDTWg4WGlITFNucFFZNWNrUm50WDZkUS9leGVj", "base64").toString("utf-8");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const action = req.query.action || "getAll";
      const targetUrl = `${BACKEND_ENDPOINT}?action=${encodeURIComponent(action)}`;
      const response = await fetch(targetUrl, { method: "GET" });
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
      const response = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  } catch (error) {
    return res.status(502).json({ success: false, error: "Gateway Error" });
  }
};
