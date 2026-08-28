/**
 * CRA Development Proxy — src/setupProxy.js
 * Compatible with http-proxy-middleware v2 (included in CRA v5)
 *
 * Routes /ha-api/*        → https://api.helloasso.com/*
 * Routes /api/send-email  → fonction locale qui appelle Resend côté serveur
 *
 * En production, /api/send-email est géré par api/send-email.js (Vercel).
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
    // ── HelloAsso ──────────────────────────────────────────────────────────
    app.use(
        "/ha-api",
        createProxyMiddleware({
            target: "https://api.helloasso.com",
            changeOrigin: true,
            secure: true,
            pathRewrite: { "^/ha-api": "" },
            onError(err, req, res) {
                console.error("[HelloAsso Proxy] Error:", err.message);
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Proxy error", detail: err.message }));
            },
            onProxyReq(proxyReq, req) {
                console.log(`[HelloAsso Proxy] → ${req.method} ${req.path}`);
            },
            onProxyRes(proxyRes, req) {
                console.log(`[HelloAsso Proxy] ← ${proxyRes.statusCode} ${req.path}`);
            },
        })
    );

    // ── Resend Email (dev local) ────────────────────────────────────────────
    // Simule la Vercel serverless function api/send-email.js en développement.
    // La clé API est lue depuis .env et injectée ici — jamais exposée au navigateur.
    app.use("/api/send-email", async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") return res.status(200).end();
        if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

        const RESEND_API_KEY = process.env.REACT_APP_RESEND_API_KEY;
        if (!RESEND_API_KEY) {
            console.error("[send-email dev] REACT_APP_RESEND_API_KEY manquante dans .env");
            return res.status(500).json({ error: "Email service not configured." });
        }

        try {
            const body = req.body;
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            console.log(`[send-email dev] ← ${response.status}`, data);
            return res.status(response.status).json(data);
        } catch (error) {
            console.error("[send-email dev] Erreur:", error);
            return res.status(500).json({ error: "Internal error", detail: error.message });
        }
    });
};

