// Removed EmailJS import, using Resend API via fetch

/**
 * Sends an email using Resend
 * @param {string} toEmail 
 * @param {string} subject 
 * @param {string} message 
 * @returns {Promise<boolean>} Success status
 */
export const sendEmail = async (toEmail, subject, message) => {
    const RESEND_API_KEY = process.env.REACT_APP_RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY configuration missing in .env");
        return false;
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: `Association ABL <${process.env.REACT_APP_RESEND_FROM_EMAIL || "contact@savantech.org"}>`,
                to: [toEmail],
                subject: subject,
                html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
            })
        });

        const data = await response.json();
        if (response.ok) {
            return true;
        } else {
            console.error("Resend API Error:", data);
            return false;
        }
    } catch (error) {
        console.error("Failed to send email with Resend:", error);
        return false;
    }
};

/**
 * Sends a meeting invitation to all attendees
 * @param {Object} meetingData 
 * @param {Array} attendeeEmails 
 */
export const sendMeetingInvite = async (meetingData, attendeeEmails) => {
    const subject = `Invitation : ${meetingData.title}`;
    const message = `
        Bonjour,
        Vous êtes invité à la réunion "${meetingData.title}" qui aura lieu le ${new Date(meetingData.date).toLocaleDateString()} à ${meetingData.time}.
        Lien de la réunion : ${meetingData.meetLink || 'Non spécifié'}
        Notes : ${meetingData.notes || 'Aucune'}
    `;

    for (const email of attendeeEmails) {
        await sendEmail(email, subject, message);
    }
};
