/**
 * CRA Development Proxy — src/setupProxy.js
 * Compatible with http-proxy-middleware v2 (included in CRA v5)
 *
 * Routes /ha-api/* → https://api.helloasso.com/*
 * This avoids CORS errors when calling HelloAsso from the browser.
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
    app.use(
        "/ha-api",
        createProxyMiddleware({
            target: "https://api.helloasso.com",
            changeOrigin: true,
            secure: true,
            // Strip /ha-api prefix: /ha-api/v5/... → /v5/...
            pathRewrite: { "^/ha-api": "" },
            // v2 event handlers (NOT the v3 "on" syntax)
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
};
