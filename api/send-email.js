/**
 * Vercel Serverless Function — /api/send-email
 *
 * Proxie les appels Resend côté serveur pour éviter les erreurs CORS.
 * La clé API RESEND_API_KEY reste dans les variables d'environnement Vercel
 * et n'est jamais exposée au navigateur.
 */

module.exports = async (req, res) => {
    // ── CORS preflight ────────────────────────────────────────────────────────
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // ── Clé API (variable d'environnement Vercel) ─────────────────────────────
    const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.REACT_APP_RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        console.error("[send-email] RESEND_API_KEY manquante dans les variables d'environnement.");
        return res.status(500).json({ error: "Email service not configured." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[send-email] Resend API error:", data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error("[send-email] Erreur interne:", error);
        return res.status(500).json({ error: "Internal server error", detail: error.message });
    }
};

// Désactiver le body parser de Vercel pour lire le JSON brut
module.exports.config = {
    api: {
        bodyParser: true,
    },
};
