import axios from 'axios';

// In development, all requests go through the CRA proxy (/ha-api -> api.helloasso.com)
// This avoids CORS errors. For production, a backend proxy is required.
const IS_DEV = process.env.NODE_ENV === 'development';
// Proxy pour contourner les erreurs CORS en production (ex: Vercel)
const PROXY_URL = process.env.REACT_APP_HELLOASSO_PROXY_URL;

const HELLOASSO_API_BASE_URL = IS_DEV 
    ? '/ha-api/v5' 
    : (PROXY_URL ? `${PROXY_URL}/v5` : 'https://api.helloasso.com/v5');

const HELLOASSO_AUTH_URL = IS_DEV 
    ? '/ha-api/oauth2/token' 
    : (PROXY_URL ? `${PROXY_URL}/oauth2/token` : 'https://api.helloasso.com/oauth2/token');

let cachedToken = null;
let tokenExpiry = null;

/**
 * Gets the OAuth2 access token from HelloAsso
 * @returns {Promise<string>} The access token
 */
export const getHelloAssoToken = async () => {
    // Check if token is still valid
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const params = new URLSearchParams();
    params.append('client_id', process.env.REACT_APP_HELLOASSO_CLIENT_ID);
    params.append('client_secret', process.env.REACT_APP_HELLOASSO_CLIENT_SECRET);
    params.append('grant_type', 'client_credentials');

    try {
        const response = await axios.post(HELLOASSO_AUTH_URL, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        cachedToken = response.data.access_token;
        // Set expiry (subtract 60s for safety)
        tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
        
        return cachedToken;
    } catch (error) {
        const detail = error?.response
            ? `HTTP ${error.response.status} on ${HELLOASSO_AUTH_URL} — ${JSON.stringify(error.response.data)}`
            : error?.message;
        console.error('Error fetching HelloAsso token:', detail);
        throw error;
    }
};

/**
 * Fetches payments for the organization
 * @param {string} organizationSlug 
 * @param {Object} filters 
 * @returns {Promise<Array>} List of payments
 */
export const fetchHelloAssoPayments = async (organizationSlug, filters = {}) => {
    const token = await getHelloAssoToken();
    const url = `${HELLOASSO_API_BASE_URL}/organizations/${organizationSlug}/payments`;

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            params: filters
        });
        return response.data?.data || response.data?.resources || [];
    } catch (error) {
        console.error('Error fetching HelloAsso payments:', error);
        throw error;
    }
};

/**
 * Fetches organization activities (Events, Donations, Memberships, etc.)
 * @param {string} organizationSlug 
 * @param {string} type - Event, Donation, Membership, CrowdFunding, PaymentForm
 * @returns {Promise<Array>} List of forms
 */
export const fetchHelloAssoForms = async (organizationSlug, type = 'PaymentForm') => {
    const token = await getHelloAssoToken();
    const url = `${HELLOASSO_API_BASE_URL}/organizations/${organizationSlug}/forms/${type}`;

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.resources;
    } catch (error) {
        console.error('Error fetching HelloAsso forms:', error);
        throw error;
    }
};

/**
 * Fetches specific form actions (e.g., list and create events, donations)
 * This is a generic fetcher for various HelloAsso resources.
 */
export const fetchHelloAssoResource = async (path, params = {}) => {
    const token = await getHelloAssoToken();
    const url = `${HELLOASSO_API_BASE_URL}/${path}`;

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            params
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching HelloAsso resource at ${path}:`, error);
        throw error;
    }
};

/**
 * Fetches all donation campaigns and their collected items for the organization.
 * Endpoint: GET /organizations/{slug}/forms/Donation
 * Then for each form: GET /organizations/{slug}/forms/Donation/{formSlug}/items
 * @param {string} organizationSlug
 * @returns {Promise<Array>} Flat list of donation items/orders
 */
export const fetchHelloAssoDonations = async (organizationSlug) => {
    const token = await getHelloAssoToken();

    try {
        // 1. Get all donation forms
        const formsRes = await axios.get(
            `${HELLOASSO_API_BASE_URL}/organizations/${organizationSlug}/forms`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { formTypes: 'Donation', pageSize: 100 }
            }
        );
        const forms = formsRes.data?.data || formsRes.data?.resources || [];

        // 2. Get orders for the whole organization (type=Donation)
        const ordersRes = await axios.get(
            `${HELLOASSO_API_BASE_URL}/organizations/${organizationSlug}/orders`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { pageSize: 100 }
            }
        );
        const orders = ordersRes.data?.data || ordersRes.data?.resources || [];

        // Filter to donation orders and normalize
        const donations = orders
            .filter(o => o.formType === 'Donation' || o.items?.some(i => i.type === 'Donation'))
            .map(o => ({
                id: o.id || o.code,
                donorName: o.payer ? `${o.payer.firstName || ''} ${o.payer.lastName || ''}`.trim() : '—',
                email: o.payer?.email || '—',
                amount: (o.amount?.total !== undefined ? o.amount.total : (o.amount !== undefined && typeof o.amount === 'number' ? o.amount : (o.totalAmount || 0))) / 100, // HelloAsso amounts are in cents
                date: o.date || o.meta?.createdAt,
                formName: o.formName || 'Don',
                status: o.state || 'Processed',
                source: 'helloasso',
            }));

        return { donations, forms };
    } catch (error) {
        console.error('Error fetching HelloAsso donations:', error?.response?.data || error.message);
        throw error;
    }
};

/**
 * Creates a HelloAsso checkout-intent for a donation campaign.
 * Returns a redirectUrl that the donor opens to complete payment.
 * NOTE: This requires a backend proxy in production (CORS limitation).
 * For now it attempts a direct call — works only if CORS is enabled or via a proxy.
 *
 * @param {string} organizationSlug
 * @param {string} formSlug - The donation form slug
 * @param {Object} params - { totalAmount (cents), initialAmount, itemName, backUrl, errorUrl, returnUrl }
 * @returns {Promise<string>} The redirect URL for the donor
 */
export const createHelloAssoCheckoutIntent = async (organizationSlug, formSlug, params) => {
    const token = await getHelloAssoToken();

    try {
        const response = await axios.post(
            `${HELLOASSO_API_BASE_URL}/organizations/${organizationSlug}/checkout-intents`,
            params,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        return response.data?.redirectUrl || response.data?.id;
    } catch (error) {
        console.error('Checkout intent error:', error?.response?.data || error.message);
        throw error;
    }
};

/**
 * Retrieves all campaign forms for the organization.
 */
export const fetchHelloAssoAllForms = async (organizationSlug) => {
    try {
        const token = await getHelloAssoToken();
        const response = await axios.get(
            `${HELLOASSO_API_BASE_URL}/organizations/${organizationSlug}/forms`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { pageSize: 100 }
            }
        );
        return response.data?.data || response.data?.resources || [];
    } catch (error) {
        console.error("Error fetching all HelloAsso forms:", error?.response?.data || error.message);
        throw error;
    }
};

/**
 * Retrieves payments specifically made to a single form/campaign.
 */
export const fetchHelloAssoFormPayments = async (organizationSlug, formType, formSlug) => {
    try {
        const token = await getHelloAssoToken();
        const response = await axios.get(
            `${HELLOASSO_API_BASE_URL}/organizations/${organizationSlug}/forms/${formType}/${formSlug}/payments`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { pageSize: 100 }
            }
        );
        return response.data?.data || response.data?.resources || [];
    } catch (error) {
        console.error(`Error fetching payments for form ${formSlug}:`, error?.response?.data || error.message);
        return [];
    }
};
