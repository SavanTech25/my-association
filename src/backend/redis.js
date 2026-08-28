/**
 * Core Redis client utilizing Upstash Redis REST API.
 * This runs directly in the browser using simple HTTP fetch calls.
 */

function parseRedisUrl(urlStr) {
    // format: rediss://default:token@host:port or rediss://:token@host:port
    const cleaned = urlStr.replace("rediss://", "").replace("redis://", "").trim().replace(/['"]/g, "");
    const [authPart, hostPart] = cleaned.split("@");
    if (!hostPart) {
        throw new Error("Invalid Redis connection URL string structure");
    }
    const token = authPart.includes(":") ? authPart.split(":")[1] : authPart;
    const host = hostPart.split(":")[0];
    return {
        url: `https://${host}`,
        token: token
    };
}

/**
 * Executes a Redis command against the Upstash REST API.
 * @param {Array} command - e.g. ["SET", "key", "val"]
 */
export async function redisCommand(command) {
    const rawUrl = process.env.REACT_APP_REDIS_URL || "rediss://default:gQAAAAAAAex9AAIgcDJkODA1Nzg2MGZiNmU0ZmY2OTI3N2EyOGVjYjBiYmY4ZA@unified-monkey-126077.upstash.io:6379";
    let url = "";
    let token = "";
    
    if (rawUrl.startsWith("redis://") || rawUrl.startsWith("rediss://")) {
        const parsed = parseRedisUrl(rawUrl);
        url = parsed.url;
        token = parsed.token;
    } else {
        url = rawUrl;
    }
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(command)
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Redis HTTP error: ${response.status} ${response.statusText} - ${errText}`);
    }
    
    const data = await response.json();
    return data.result;
}

/**
 * Generates a unique UUID v4.
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : ((r & 0x3) | 0x8);
        return v.toString(16);
    });
}
