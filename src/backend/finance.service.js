import { redisCommand, generateUUID } from "./redis";

const BALANCE_KEY = "meta:balance";
const FINANCES_IDS_KEY = "finances:ids";
const EXPENSE_REPORTS_IDS_KEY = "expense-reports:ids";
const LAST_IMPORT_KEY = "meta:last_import_at";

/**
 * Saves the current timestamp as the last HelloAsso import date.
 * @returns {Promise<void>}
 */
export const setLastImportDate = async () => {
    await redisCommand(["SET", LAST_IMPORT_KEY, new Date().toISOString()]);
};

/**
 * Retrieves the last HelloAsso import date.
 * @returns {Promise<string|null>} ISO date string or null
 */
export const getLastImportDate = async () => {
    try {
        return await redisCommand(["GET", LAST_IMPORT_KEY]);
    } catch {
        return null;
    }
};

/**
 * Adds a new financial entry.
 */
export const addFinanceEntry = async (entryData) => {
    try {
        // 1. Get the current balance (default to 0 if not found)
        const balanceStr = await redisCommand(["GET", BALANCE_KEY]);
        const currentBalance = balanceStr ? parseFloat(balanceStr) : 0;
        
        // 2. Compute the new balance
        const newBalance = entryData.type === "income"
            ? currentBalance + entryData.amount
            : currentBalance - entryData.amount;
            
        // 3. Save the new balance
        await redisCommand(["SET", BALANCE_KEY, String(newBalance)]);
        
        // 4. Generate entry ID and save the transaction entry
        const id = generateUUID();
        const dataToSave = {
            ...entryData,
            id,
            balanceAfter: newBalance,
            createdAt: new Date().toISOString(),
        };
        
        await redisCommand(["SET", `finance:${id}`, JSON.stringify(dataToSave)]);
        await redisCommand(["SADD", FINANCES_IDS_KEY, id]);
        
        return id;
    } catch (error) {
        console.error("Error adding finance entry:", error);
        throw error;
    }
};

/**
 * Fetches all financial entries.
 */
export const getAllFinanceEntries = async () => {
    try {
        const ids = await redisCommand(["SMEMBERS", FINANCES_IDS_KEY]);
        if (!ids || ids.length === 0) {
            return [];
        }
        
        const keys = ids.map(id => `finance:${id}`);
        const entriesData = await redisCommand(["MGET", ...keys]);
        
        const entries = entriesData
            .filter(Boolean)
            .map(dataStr => JSON.parse(dataStr));
            
        // Sort by date desc
        return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error("Error getting finance entries:", error);
        return [];
    }
};

/**
 * Gets the current balance.
 */
export const getCurrentBalance = async () => {
    try {
        const balanceStr = await redisCommand(["GET", BALANCE_KEY]);
        return balanceStr ? parseFloat(balanceStr) : 0;
    } catch (error) {
        console.warn("Could not fetch balance from Redis:", error.message);
        return 0;
    }
};

/**
 * Gets entries by type.
 */
export const getEntriesByType = async (type) => {
    try {
        const allEntries = await getAllFinanceEntries();
        return allEntries.filter(entry => entry.type === type);
    } catch (error) {
        console.error("Error getting entries by type:", error);
        return [];
    }
};

/**
 * Deletes a financial entry and recalculates the balance.
 */
export const deleteFinanceEntry = async (id) => {
    try {
        const entryStr = await redisCommand(["GET", `finance:${id}`]);
        if (!entryStr) return false;
        const entry = JSON.parse(entryStr);
        
        // 1. Revert balance
        const balanceStr = await redisCommand(["GET", BALANCE_KEY]);
        let currentBalance = balanceStr ? parseFloat(balanceStr) : 0;
        const newBalance = entry.type === "income"
            ? currentBalance - entry.amount
            : currentBalance + entry.amount;
            
        await redisCommand(["SET", BALANCE_KEY, String(newBalance)]);
        
        // 2. Remove entry
        await redisCommand(["SREM", FINANCES_IDS_KEY, id]);
        await redisCommand(["DEL", `finance:${id}`]);
        return true;
    } catch (error) {
        console.error("Error deleting finance entry:", error);
    }
};

/**
 * Adds a new expense report (Note de frais)
 */
export const addExpenseReport = async (reportData) => {
    try {
        const id = generateUUID();
        const dataToSave = {
            ...reportData,
            id,
            status: "pending",
            createdAt: new Date().toISOString(),
        };
        await redisCommand(["SET", `expense-report:${id}`, JSON.stringify(dataToSave)]);
        await redisCommand(["SADD", EXPENSE_REPORTS_IDS_KEY, id]);
        return id;
    } catch (error) {
        console.error("Error adding expense report:", error);
        throw error;
    }
};

/**
 * Fetches all expense reports
 */
export const getAllExpenseReports = async () => {
    try {
        const ids = await redisCommand(["SMEMBERS", EXPENSE_REPORTS_IDS_KEY]);
        if (!ids || ids.length === 0) return [];
        
        const keys = ids.map(id => `expense-report:${id}`);
        const entriesData = await redisCommand(["MGET", ...keys]);
        
        const entries = entriesData
            .filter(Boolean)
            .map(dataStr => JSON.parse(dataStr));
            
        return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error("Error getting expense reports:", error);
        return [];
    }
};

/**
 * Updates an expense report status
 */
export const updateExpenseReportStatus = async (id, status) => {
    try {
        const entryStr = await redisCommand(["GET", `expense-report:${id}`]);
        if (!entryStr) return false;
        
        const entry = JSON.parse(entryStr);
        entry.status = status;
        entry.updatedAt = new Date().toISOString();
        
        await redisCommand(["SET", `expense-report:${id}`, JSON.stringify(entry)]);
        return entry;
    } catch (error) {
        console.error("Error updating expense report status:", error);
        throw error;
    }
};
