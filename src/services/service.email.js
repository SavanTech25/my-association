// Resend emails are sent through the /resend-api dev-proxy (setupProxy.js)
// to avoid CORS — the API key is injected server-side, never sent to the browser.

/**
 * Sends a welcome email to a new member using Resend.
 *
 * @param {Object} member  - Member data
 * @param {string} [cardBase64] - Member card PDF in base64 dataURI
 * @param {string} [receiptBase64] - Receipt PDF in base64 dataURI
 * @returns {Promise<boolean>}
 */
export async function sendMemberCardEmail(member, cardBase64, receiptBase64) {
    if (!member?.email) {
        console.warn("No email address for member, skipping email.");
        return false;
    }

    const htmlContent = `
        <h3>Bienvenue à l'Association des Burkinabè de Lyon (ABL)</h3>
        <p>Bonjour ${member.firstname || ""} ${member.lastname || ""},</p>
        <p>Nous vous confirmons votre adhésion à l'ABL.</p>
        <p>Numéro d'adhérent : <strong>${member.memberNumber || "—"}</strong></p>
        <p>Date d'adhésion : ${member.joinDate ? new Date(member.joinDate).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}</p>
        <p>Veuillez trouver ci-joint votre carte de membre${receiptBase64 ? ' ainsi que votre reçu de cotisation' : ''}.</p>
        <br/>
        <p>Cordialement,<br/>L'équipe ABL</p>
    `;

    const attachments = [];
    if (cardBase64) {
        // Remove data URI scheme
        const base64Data = cardBase64.split(';base64,').pop();
        attachments.push({
            filename: `carte_membre_${member.memberNumber || member.lastname}.pdf`,
            content: base64Data
        });
    }

    if (receiptBase64) {
        const base64Data = receiptBase64.split(';base64,').pop();
        attachments.push({
            filename: `recu_${member.memberNumber || member.lastname}.pdf`,
            content: base64Data
        });
    }

    try {
        const response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: `Association ABL <${process.env.REACT_APP_RESEND_FROM_EMAIL || "contact@savantech.org"}>`, 
                to: [member.email],
                subject: "Bienvenue à l'ABL - Votre carte de membre",
                html: htmlContent,
                attachments: attachments
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log("Resend response:", data);
            return true;
        } else {
            console.error("Resend send error:", data);
            return false;
        }
    } catch (error) {
        console.error("Resend network/send error:", error);
        return false;
    }
}
