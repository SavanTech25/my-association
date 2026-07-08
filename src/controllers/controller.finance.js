import { toast } from "react-toastify";
import { 
    addFinanceEntry, 
    getAllFinanceEntries, 
    getCurrentBalance,
    deleteFinanceEntry
} from "../backend/finance.service";

/**
 * Handles adding a new financial entry (income/expense)
 * @param {Object} entryData 
 * @returns {Promise<boolean>} Success status
 */
export async function handleAddFinance(entryData) {
    try {
        await addFinanceEntry(entryData);
        toast.success("Transaction enregistrée");
        return true;
    } catch (error) {
        toast.error("Erreur d'enregistrement financiers");
        return false;
    }
}

/**
 * Fetches all financial entries
 * @returns {Promise<Array>} List of entries
 */
export async function handleGetFinances() {
    try {
        return await getAllFinanceEntries();
    } catch (error) {
        toast.error("Erreur de récupération des finances");
        return [];
    }
}

/**
 * Gets the current solde (balance)
 * @returns {Promise<number>} Current balance
 */
export async function handleGetBalance() {
    try {
        return await getCurrentBalance();
    } catch (error) {
        toast.error("Erreur calcul du solde");
        return 0;
    }
}

/**
 * Handles deleting a financial entry
 */
export async function handleDeleteFinance(id) {
    try {
        const success = await deleteFinanceEntry(id);
        if (success) {
            toast.success("Écriture supprimée avec succès");
            return true;
        }
        throw new Error("Introuvable");
    } catch (error) {
        toast.error("Erreur lors de la suppression de l'écriture");
        return false;
    }
}
