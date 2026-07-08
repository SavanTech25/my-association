import { redisCommand } from "../backend/redis";

/**
 * Generates the next unique member number in the format ABL_YYYY_XXXXXX.
 * Uses an atomic Redis key counter to ensure uniqueness across all sessions.
 * @returns {Promise<string>} e.g. "ABL_2025_000042"
 */
export async function generateMemberNumber() {
    // Atomically increment the counter in Redis
    const count = await redisCommand(["INCR", "counter:memberNumber"]);
    return formatMemberNumber(count);
}

/**
 * Formats a number into the ABL member number format.
 * @param {number} n
 * @returns {string} e.g. "ABL_2025_000042"
 */
function formatMemberNumber(n) {
    const year = new Date().getFullYear();
    const padded = String(n).padStart(6, "0");
    return `ABL_${year}_${padded}`;
}
