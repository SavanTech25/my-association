import { toast } from "react-toastify";
import { 
    addMember, 
    getAllMembers, 
    updateMember, 
    deleteMember
} from "../backend/member.service";

/**
 * Handles adding a new member
 * @param {Object} memberData 
 * @returns {Promise<boolean>} Success status
 */
export async function handleAddMember(memberData) {
    try {
        await addMember(memberData);
        toast.success("Membre ajouté avec succès");
        return true;
    } catch (error) {
        toast.error("Erreur lors de l'ajout du membre");
        return false;
    }
}

/**
 * Fetches all members and displays error if fails
 * @returns {Promise<Array>} List of members
 */
export async function handleGetMembers() {
    try {
        return await getAllMembers();
    } catch (error) {
        toast.error("Erreur lors de la récupération des membres");
        return [];
    }
}

/**
 * Handles updating a member
 * @param {string} id 
 * @param {Object} updatedData 
 * @returns {Promise<boolean>} Success status
 */
export async function handleUpdateMember(id, updatedData) {
    try {
        await updateMember(id, updatedData);
        toast.success("Membre mis à jour");
        return true;
    } catch (error) {
        toast.error("Erreur lors de la mise à jour");
        return false;
    }
}

/**
 * Handles deleting a member
 * @param {string} id 
 * @returns {Promise<boolean>} Success status
 */
export async function handleDeleteMember(id) {
    if (window.confirm("Voulez-vous vraiment supprimer ce membre ?")) {
        try {
            await deleteMember(id);
            toast.success("Membre supprimé");
            return true;
        } catch (error) {
            toast.error("Erreur lors de la suppression");
            return false;
        }
    }
    return false;
}
