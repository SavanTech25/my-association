// Resend emails are sent through the /api/send-email Vercel function
// to avoid CORS — the API key is injected server-side, never sent to the browser.

/**
 * Sends a member card email (welcome or renewal) using Resend.
 *
 * @param {Object} member        - Member data
 * @param {string} [cardBase64]  - Member card PDF in base64 dataURI
 * @param {string} [receiptBase64] - Receipt PDF in base64 dataURI
 * @param {boolean} [isReinscription=false] - true = renewal email, false = welcome email
 * @returns {Promise<boolean>}
 */
export async function sendMemberCardEmail(member, cardBase64, receiptBase64, isReinscription = false) {
    if (!member?.email) {
        console.warn("No email address for member, skipping email.");
        return false;
    }

    const year = new Date().getFullYear();
    const joinDateFr = member.joinDate
        ? new Date(member.joinDate).toLocaleDateString("fr-FR")
        : new Date().toLocaleDateString("fr-FR");

    const subject = isReinscription
        ? `Renouvellement de votre adhésion ABL ${year}`
        : "Bienvenue à l'ABL – Votre carte de membre";

    const htmlContent = isReinscription
        ? `
        <h3>Renouvellement de votre adhésion – ABL ${year}</h3>
        <p>Bonjour ${member.firstname || ""} ${member.lastname || ""},</p>
        <p>Nous vous confirmons le renouvellement de votre adhésion à l'Association des Burkinabè de Lyon (ABL) pour l'année <strong>${year}</strong>.</p>
        <p>Numéro d'adhérent : <strong>${member.memberNumber || "—"}</strong></p>
        <p>Date de renouvellement : <strong>${joinDateFr}</strong></p>
        <p>Veuillez trouver ci-joint votre nouvelle carte de membre${receiptBase64 ? " ainsi que votre reçu de cotisation" : ""}.</p>
        <br/>
        <p>Cordialement,<br/>L'équipe ABL</p>
        `
        : `
        <h3>Bienvenue à l'Association des Burkinabè de Lyon (ABL)</h3>
        <p>Bonjour ${member.firstname || ""} ${member.lastname || ""},</p>
        <p>Nous vous confirmons votre adhésion à l'ABL.</p>
        <p>Numéro d'adhérent : <strong>${member.memberNumber || "—"}</strong></p>
        <p>Date d'adhésion : <strong>${joinDateFr}</strong></p>
        <p>Veuillez trouver ci-joint votre carte de membre${receiptBase64 ? " ainsi que votre reçu de cotisation" : ""}.</p>
        <br/>
        <p>Cordialement,<br/>L'équipe ABL</p>
        `;

    const attachments = [];
    if (cardBase64) {
        const base64Data = cardBase64.split(";base64,").pop();
        attachments.push({
            filename: `carte_membre_${member.memberNumber || member.lastname}.pdf`,
            content: base64Data,
        });
    }
    if (receiptBase64) {
        const base64Data = receiptBase64.split(";base64,").pop();
        attachments.push({
            filename: `recu_${member.memberNumber || member.lastname}.pdf`,
            content: base64Data,
        });
    }

    try {
        const response = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                from: `Association ABL <${process.env.REACT_APP_RESEND_FROM_EMAIL || "contact@resend.savantech.org"}>`,
                to: [member.email],
                subject,
                html: htmlContent,
                attachments,
            }),
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

