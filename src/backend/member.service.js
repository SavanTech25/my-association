import { redisCommand, generateUUID } from "./redis";
import { generateMemberNumber } from "../services/service.memberNumber";

/**
 * Ensures that a default President account exists in Redis.
 * This replaces the Firebase Auth admin account.
 */
export const ensureDefaultPresidentAccount = async () => {
    try {
        const adminEmail = "savantech25@gmail.com";
        const emailKey = `member:email:${adminEmail.toLowerCase()}`;
        const existingId = await redisCommand(["GET", emailKey]);
        
        if (!existingId) {
            console.log("No President account found. Initializing default President account...");
            const id = "president-default-id";
            const defaultPresident = {
                id,
                firstname: "Admin",
                lastname: "Admin",
                email: adminEmail,
                phone: "+33643602852",
                role: "president",
                status: "active",
                joinDate: new Date().toISOString(),
                isSubscribed: true,
                password: "Admin123&", // Credentials stored for local authentication
                createdAt: new Date().toISOString()
            };
            
            // Save in pipeline
            await redisCommand(["SET", `member:${id}`, JSON.stringify(defaultPresident)]);
            await redisCommand(["SET", emailKey, id]);
            await redisCommand(["SADD", "members:ids", id]);
            console.log("✅ Default President account created successfully!");
        }
    } catch (error) {
        console.error("Error creating default president account:", error);
    }
};

/**
 * Adds a new member to Redis
 * @param {Object} memberData 
 * @returns {Promise<string>} The member ID
 */
export const addMember = async (memberData) => {
    try {
        const id = generateUUID();
        const dataToSave = {
            ...memberData,
            id,
            createdAt: new Date().toISOString()
        };
        
        await redisCommand(["SET", `member:${id}`, JSON.stringify(dataToSave)]);
        await redisCommand(["SADD", "members:ids", id]);
        
        if (memberData.email) {
            const emailKey = `member:email:${memberData.email.toLowerCase()}`;
            await redisCommand(["SET", emailKey, id]);
        }
        
        return id;
    } catch (error) {
        console.error("Error adding member: ", error);
        throw error;
    }
};

/**
 * Adds a member with an auto-generated unique member number (ABL_YYYY_XXXXXX).
 * @param {Object} memberData
 * @returns {Promise<Object>} The created member with id and memberNumber
 */
export const addMemberWithNumber = async (memberData) => {
    try {
        const memberNumber = await generateMemberNumber();
        const id = generateUUID();
        const dataToSave = {
            ...memberData,
            id,
            memberNumber,
            createdAt: new Date().toISOString(),
        };
        
        await redisCommand(["SET", `member:${id}`, JSON.stringify(dataToSave)]);
        await redisCommand(["SADD", "members:ids", id]);
        
        if (memberData.email) {
            const emailKey = `member:email:${memberData.email.toLowerCase()}`;
            await redisCommand(["SET", emailKey, id]);
        }
        
        return dataToSave;
    } catch (error) {
        console.error("Error adding member with number: ", error);
        throw error;
    }
};

/**
 * Fetches all members from Redis.
 * @returns {Promise<Array>} List of members
 */
export const getAllMembers = async () => {
    try {
        // Ensure default president is initialized first
        await ensureDefaultPresidentAccount();
        
        const ids = await redisCommand(["SMEMBERS", "members:ids"]);
        if (!ids || ids.length === 0) {
            return [];
        }
        
        // Fetch all members via MGET
        const keys = ids.map(id => `member:${id}`);
        const membersData = await redisCommand(["MGET", ...keys]);
        
        const members = membersData
            .filter(Boolean)
            .map(dataStr => JSON.parse(dataStr));
            
        console.log(`Fetched ${members.length} members from Redis.`);
        return members;
    } catch (error) {
        console.error("Error getting members: ", error);
        return [];
    }
};

/**
 * Gets a specific member by ID
 */
export const getMemberById = async (id) => {
    try {
        await ensureDefaultPresidentAccount();
        
        const dataStr = await redisCommand(["GET", `member:${id}`]);
        if (dataStr) {
            return JSON.parse(dataStr);
        }
        return null;
    } catch (error) {
        console.error("Error getting member: ", error);
        throw error;
    }
};

/**
 * Updates an existing member
 */
export const updateMember = async (id, updatedData) => {
    try {
        const existingMember = await getMemberById(id);
        if (!existingMember) {
            throw new Error(`Member with ID ${id} not found`);
        }
        
        const oldEmail = existingMember.email;
        const newEmail = updatedData.email;
        
        const dataToSave = {
            ...existingMember,
            ...updatedData,
            updatedAt: new Date().toISOString()
        };
        
        await redisCommand(["SET", `member:${id}`, JSON.stringify(dataToSave)]);
        
        // If email has changed, update email lookup indexes
        if (oldEmail !== newEmail) {
            if (oldEmail) {
                await redisCommand(["DEL", `member:email:${oldEmail.toLowerCase()}`]);
            }
            if (newEmail) {
                await redisCommand(["SET", `member:email:${newEmail.toLowerCase()}`, id]);
            }
        }
    } catch (error) {
        console.error("Error updating member: ", error);
        throw error;
    }
};

/**
 * Deletes a member
 */
export const deleteMember = async (id) => {
    try {
        const member = await getMemberById(id);
        if (member) {
            if (member.email) {
                await redisCommand(["DEL", `member:email:${member.email.toLowerCase()}`]);
            }
            await redisCommand(["DEL", `member:${id}`]);
            await redisCommand(["SREM", "members:ids", id]);
        }
    } catch (error) {
        console.error("Error deleting member: ", error);
        throw error;
    }
};

/**
 * Updates only the joinDate of a member (used for re-inscriptions).
 * @param {string} id - Member ID
 * @param {string} newJoinDate - ISO date string
 * @returns {Promise<Object>} Updated member object
 */
export const updateMemberJoinDate = async (id, newJoinDate) => {
    try {
        const existingMember = await getMemberById(id);
        if (!existingMember) {
            throw new Error(`Member with ID ${id} not found`);
        }
        const dataToSave = {
            ...existingMember,
            joinDate: newJoinDate,
            lastReinscriptionAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await redisCommand(["SET", `member:${id}`, JSON.stringify(dataToSave)]);
        return dataToSave;
    } catch (error) {
        console.error("Error updating member joinDate:", error);
        throw error;
    }
};

/**
 * Gets members by role
 */
export const getMembersByRole = async (role) => {
    try {
        const allMembers = await getAllMembers();
        return allMembers.filter(m => m.role === role);
    } catch (error) {
        console.error("Error getting members by role: ", error);
        return [];
    }
};
