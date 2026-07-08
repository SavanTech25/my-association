import { toast } from "react-toastify";
import { removeAll } from "../hooks/hooks.localStorage";
import { redisCommand, generateUUID } from "../backend/redis";
import { addMember } from "../backend/member.service";

/**
 * Handles login using Redis instead of Firebase Authentication.
 */
export async function handleLogin(e, email, password) {
    if (e) e.preventDefault();

    if (email === "" || password === "") {
        toast.error("Veuillez remplir tous les champs");
        return -1;
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const emailKey = `member:email:${normalizedEmail}`;
        
        // 1. Fetch user ID by email
        const uid = await redisCommand(["GET", emailKey]);
        if (!uid) {
            toast.error("Email ou mot de passe incorrect");
            return -1;
        }

        // 2. Fetch full member data
        const memberDataStr = await redisCommand(["GET", `member:${uid}`]);
        if (!memberDataStr) {
            toast.error("Email ou mot de passe incorrect");
            return -1;
        }

        const member = JSON.parse(memberDataStr);

        // 3. Verify password (only admin roles should log in)
        const ADMIN_ROLES = ["president", "tresorier", "secretaire"];
        if (!ADMIN_ROLES.includes(member.role)) {
            toast.error("Accès refusé : ce compte n'a pas les droits d'accès.");
            return -1;
        }

        if (member.password !== password) {
            toast.error("Email ou mot de passe incorrect");
            return -1;
        }

        // 4. Create user session payload (excluding password)
        const { password: _, ...userData } = member;

        toast.success(`Bienvenue, ${userData.firstname || userData.email} !`);
        return {
            type: "login",
            value: {
                user: userData,
                token: `redis-session-token-${uid}-${Date.now()}`,
            },
        };
    } catch (error) {
        console.error("Login Error:", error);
        toast.error("Erreur de connexion : " + error.message);
        return -1;
    }
}

/**
 * Handles logout.
 */
export async function handleLogout(dispatch) {
    try {
        dispatch({ type: "logout" });
        removeAll();
        toast.info("Vous êtes déconnecté");
    } catch (error) {
        toast.error("Erreur lors de la déconnexion");
    }
}

/**
 * Creates a new user (admin role with login password, or a regular member).
 */
export async function handleCreateAdminUser(userData, adminEmail, adminPassword) {
    const ADMIN_ROLES = ["president", "tresorier", "secretaire"];
    const isAdminRole = ADMIN_ROLES.includes(userData.role);

    try {
        const normalizedEmail = userData.email.toLowerCase().trim();
        const emailKey = `member:email:${normalizedEmail}`;
        
        // Check if email already exists
        const existingId = await redisCommand(["GET", emailKey]);
        if (existingId) {
            toast.error("Cet email est déjà utilisé.");
            return false;
        }

        if (isAdminRole) {
            // Save admin account with password directly in Redis
            const id = generateUUID();
            const dataToSave = {
                ...userData,
                id,
                createdAt: new Date().toISOString(),
                isSubscribed: true,
                status: "active",
            };

            await redisCommand(["SET", `member:${id}`, JSON.stringify(dataToSave)]);
            await redisCommand(["SADD", "members:ids", id]);
            await redisCommand(["SET", emailKey, id]);

            toast.success(`Compte créé pour ${userData.firstname} (${userData.role})`);
            return true;
        } else {
            // Regular member: use addMember (no login / no password)
            const { password, ...memberOnlyData } = userData;
            await addMember(memberOnlyData);
            toast.success("Membre ajouté avec succès");
            return true;
        }
    } catch (error) {
        console.error("Create user error:", error);
        toast.error("Erreur : " + error.message);
        return false;
    }
}