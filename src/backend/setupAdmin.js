import { ensureDefaultPresidentAccount } from "./member.service";

/**
 * One-time setup script to create the President account in Redis.
 */
export const createPresidentAccount = async () => {
    try {
        console.log("Starting President account creation in Redis...");
        await ensureDefaultPresidentAccount();
        console.log("✅ President Redis account synced successfully!");
        return true;
    } catch (error) {
        console.error("❌ Error syncing President account:", error);
        return false;
    }
};
