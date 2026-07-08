import { toast } from "react-toastify";
import { 
    scheduleMeeting, 
    getAllMeetings, 
    updateMeeting, 
    deleteMeeting 
} from "../backend/meeting.service";

/**
 * Handles scheduling a new meeting
 * @param {Object} formData 
 * @returns {Promise<Object>} Success status and meeting details
 */
export async function handleScheduleMeeting(formData) {
    try {
        const { meetType, sendEmailToAdmins, ...meetingData } = formData;
        
        // 1. Schedule the meeting in Redis
        const meetingId = await scheduleMeeting(meetingData);
        toast.success("Réunion planifiée avec succès");
        
        const fullMeeting = { ...meetingData, id: meetingId };
        
        // 2. Send email to all admins if checked
        if (sendEmailToAdmins) {
            try {
                const { getAllMembers } = await import("../backend/member.service");
                const { sendMeetingInvite } = await import("../backend/email.service");
                
                const members = await getAllMembers();
                const ADMIN_ROLES = ["president", "tresorier", "secretaire"];
                const adminEmails = members
                    .filter(m => ADMIN_ROLES.includes(m.role) && m.email)
                    .map(m => m.email);
                    
                if (adminEmails.length > 0) {
                    await sendMeetingInvite(fullMeeting, adminEmails);
                    toast.info(`Emails d'invitation envoyés à ${adminEmails.length} administrateurs.`);
                } else {
                    toast.warning("Aucun administrateur avec un email valide n'a été trouvé.");
                }
            } catch (emailErr) {
                console.error("Error sending admin emails:", emailErr);
                toast.error("Erreur lors de l'envoi des emails aux administrateurs.");
            }
        }
        
        return { success: true, meeting: fullMeeting };
    } catch (error) {
        console.error("Error scheduling meeting:", error);
        toast.error("Erreur lors de la planification");
        return { success: false };
    }
}

/**
 * Handles fetching all meetings and displays error if fails
 * @returns {Promise<Array>} List of meetings
 */
export async function handleGetMeetings() {
    try {
        return await getAllMeetings();
    } catch (error) {
        toast.error("Erreur de récupération des réunions");
        return [];
    }
}

/**
 * Handles updating meeting (CR, link, etc.)
 * @param {string} id 
 * @param {Object} updatedData 
 * @returns {Promise<boolean>} Success status
 */
export async function handleUpdateMeeting(id, updatedData) {
    try {
        await updateMeeting(id, updatedData);
        toast.info("Réunion mise à jour");
        return true;
    } catch (error) {
        toast.error("Erreur de mise à jour");
        return false;
    }
}

/**
 * Handles deleting a meeting
 * @param {string} id 
 * @returns {Promise<boolean>} Success status
 */
export async function handleDeleteMeeting(id) {
    if (window.confirm("Voulez-vous supprimer cette réunion ?")) {
        try {
            await deleteMeeting(id);
            toast.success("Réunion supprimée");
            return true;
        } catch (error) {
            toast.error("Erreur de suppression");
            return false;
        }
    }
    return false;
}
