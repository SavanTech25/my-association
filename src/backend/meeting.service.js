import { redisCommand, generateUUID } from "./redis";

const MEETINGS_IDS_KEY = "meetings:ids";

/**
 * Schedules a new meeting
 * @param {Object} meetingData - title, date, meetLink, attendees, notes, etc.
 * @returns {Promise<string>} The document ID
 */
export const scheduleMeeting = async (meetingData) => {
    try {
        const id = generateUUID();
        const dataToSave = {
            ...meetingData,
            id,
            createdAt: new Date().toISOString()
        };
        
        await redisCommand(["SET", `meeting:${id}`, JSON.stringify(dataToSave)]);
        await redisCommand(["SADD", MEETINGS_IDS_KEY, id]);
        
        return id;
    } catch (error) {
        console.error("Error scheduling meeting: ", error);
        throw error;
    }
};

/**
 * Fetches all meetings from Redis ordered by date
 * @returns {Promise<Array>} List of meetings
 */
export const getAllMeetings = async () => {
    try {
        const ids = await redisCommand(["SMEMBERS", MEETINGS_IDS_KEY]);
        if (!ids || ids.length === 0) {
            return [];
        }
        
        const keys = ids.map(id => `meeting:${id}`);
        const meetingsData = await redisCommand(["MGET", ...keys]);
        
        const meetings = meetingsData
            .filter(Boolean)
            .map(dataStr => JSON.parse(dataStr));
            
        // Sort by date desc
        return meetings.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error("Error getting meetings: ", error);
        throw error;
    }
};

/**
 * Gets a specific meeting by ID
 * @param {string} id 
 * @returns {Promise<Object>} Meeting data
 */
export const getMeetingById = async (id) => {
    try {
        const dataStr = await redisCommand(["GET", `meeting:${id}`]);
        if (dataStr) {
            return JSON.parse(dataStr);
        }
        return null;
    } catch (error) {
        console.error("Error getting meeting: ", error);
        throw error;
    }
};

/**
 * Updates a meeting (e.g., adding meeting minutes / CR)
 * @param {string} id 
 * @param {Object} updatedData 
 */
export const updateMeeting = async (id, updatedData) => {
    try {
        const existingMeeting = await getMeetingById(id);
        if (!existingMeeting) {
            throw new Error(`Meeting with ID ${id} not found`);
        }
        
        const dataToSave = {
            ...existingMeeting,
            ...updatedData,
            updatedAt: new Date().toISOString()
        };
        
        await redisCommand(["SET", `meeting:${id}`, JSON.stringify(dataToSave)]);
    } catch (error) {
        console.error("Error updating meeting: ", error);
        throw error;
    }
};

/**
 * Deletes a meeting
 * @param {string} id 
 */
export const deleteMeeting = async (id) => {
    try {
        await redisCommand(["DEL", `meeting:${id}`]);
        await redisCommand(["SREM", MEETINGS_IDS_KEY, id]);
    } catch (error) {
        console.error("Error deleting meeting: ", error);
        throw error;
    }
};
