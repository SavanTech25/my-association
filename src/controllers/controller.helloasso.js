import { toast } from "react-toastify";
import { 
    fetchHelloAssoPayments, 
    fetchHelloAssoForms, 
    fetchHelloAssoResource,
    fetchHelloAssoDonations,
    createHelloAssoCheckoutIntent,
    fetchHelloAssoAllForms,
    fetchHelloAssoFormPayments,
} from "../backend/helloasso.service";

/**
 * Handles fetching organization payments from HelloAsso
 * @param {string} organizationSlug 
 * @param {Object} filters 
 * @returns {Promise<Array>} List of payments
 */
export async function handleGetHelloAssoPayments(organizationSlug, filters = {}) {
    try {
        const payments = await fetchHelloAssoPayments(organizationSlug, filters);
        toast.info(`${payments.length} paiements récupérés de HelloAsso`);
        return payments;
    } catch (error) {
        toast.error("Échec de synchronisation HelloAsso");
        return [];
    }
}

/**
 * Handles fetching forms/campaigns from HelloAsso
 * @param {string} organizationSlug 
 * @param {string} type 
 * @returns {Promise<Array>} List of forms
 */
export async function handleGetHelloAssoForms(organizationSlug, type) {
    try {
        const forms = await fetchHelloAssoForms(organizationSlug, type);
        return forms;
    } catch (error) {
        toast.error(`Erreur de récupération des formulaires ${type}`);
        return [];
    }
}

/**
 * Lists and syncs various resources (events, donations, etc.)
 * @param {string} path 
 * @returns {Promise<any>} Response data
 */
export async function handleGetHelloAssoResource(path) {
    try {
        return await fetchHelloAssoResource(path);
    } catch (error) {
        toast.error(`Erreur HelloAsso: ${path}`);
        return null;
    }
}

/**
 * Fetches all donation orders from HelloAsso for the organization.
 * @param {string} organizationSlug
 * @returns {Promise<{donations: Array, forms: Array}>}
 */
export async function handleGetDonations(organizationSlug) {
    try {
        const result = await fetchHelloAssoDonations(organizationSlug);
        return result;
    } catch (error) {
        toast.error("Impossible de récupérer les dons HelloAsso");
        return { donations: [], forms: [] };
    }
}

/**
 * Creates a HelloAsso checkout-intent (payment link) for a donation form.
 * The returned URL is opened in a new tab for the donor to complete payment.
 * @param {string} organizationSlug
 * @param {string} formSlug
 * @param {Object} params
 * @returns {Promise<string|null>} Redirect URL or null on failure
 */
export async function handleCreateDonationLink(organizationSlug, formSlug, params) {
    try {
        const url = await createHelloAssoCheckoutIntent(organizationSlug, formSlug, params);
        return url;
    } catch (error) {
        toast.error("Impossible de créer le lien de don HelloAsso");
        return null;
    }
}

/**
 * Exposes all forms from HelloAsso.
 */
export async function handleGetAllHelloAssoForms(organizationSlug) {
    try {
        const forms = await fetchHelloAssoAllForms(organizationSlug);
        return forms;
    } catch (error) {
        console.error("Error fetching all campaigns:", error);
        return [];
    }
}

/**
 * Exposes payers list for a given HelloAsso form.
 */
export async function handleGetHelloAssoFormPayments(organizationSlug, formType, formSlug) {
    try {
        const payments = await fetchHelloAssoFormPayments(organizationSlug, formType, formSlug);
        return payments;
    } catch (error) {
        console.error("Error fetching campaign payments:", error);
        return [];
    }
}
