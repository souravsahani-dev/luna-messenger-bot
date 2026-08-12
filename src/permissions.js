const fs = require('fs');
const path = require('path');
const config = require('./config');

// Simple in-memory cache for thread info to prevent rate limiting
const threadInfoCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ADMINS_FILE = path.resolve(__dirname, '..', 'admins.json');

/**
 * Helper to get dynamic bot admins from file
 */
function getDynamicAdmins() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      const data = fs.readFileSync(ADMINS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[ERROR] Failed to read admins.json:', err);
  }
  return [];
}

/**
 * Checks if a user is a strict Bot Admin (Global control).
 * @param {string} senderId The ID of the user
 * @returns {boolean} True if Bot Admin
 */
function isBotAdmin(senderId) {
  // Check .env super admins
  if (config.ADMIN_IDS.includes(senderId)) return true;
  
  // Check dynamic admins
  const dynamicAdmins = getDynamicAdmins();
  if (dynamicAdmins.includes(senderId)) return true;

  return false;
}

/**
 * Checks if a user is an admin (either Bot Admin or Group Admin).
 * @param {object} api The FCA api object
 * @param {string} senderId The ID of the user requesting the command
 * @param {string} threadId The ID of the thread where the command was issued
 * @returns {Promise<boolean>} True if admin, false otherwise.
 */
async function isAdmin(api, senderId, threadId) {
  // 1. Check Bot Admins first (global control)
  if (isBotAdmin(senderId)) {
    return true;
  }

  // 2. Check Group Admins
  try {
    let threadInfo = threadInfoCache.get(threadId);

    // Fetch if not in cache or if cache is expired (handled implicitly by not finding it)
    if (!threadInfo) {
      threadInfo = await new Promise((resolve, reject) => {
        api.getThreadInfo(threadId, (err, info) => {
          if (err) return reject(err);
          resolve(info);
        });
      });

      // Cache the result
      threadInfoCache.set(threadId, threadInfo);
      
      // Auto-evict from cache after TTL
      setTimeout(() => {
        threadInfoCache.delete(threadId);
      }, CACHE_TTL_MS);
    }

    // Check if the sender is in the group's admin list
    // FCA returns adminIDs as an array of objects: [{ id: '1000...' }]
    if (threadInfo && Array.isArray(threadInfo.adminIDs)) {
      return threadInfo.adminIDs.some(admin => admin.id === senderId);
    }
    
    return false;

  } catch (error) {
    // Fail closed: if we can't get thread info (e.g., private chat, error), assume not a group admin
    console.error(`[WARNING] Failed to fetch thread info for admin check in ${threadId}:`, error.message || error);
    return false;
  }
}

module.exports = {
  isAdmin,
  isBotAdmin
};
