const fs = require('fs');
const path = require('path');
const config = require('./config');
const permissions = require('./permissions');

const commands = new Map();

// Rate limiting: max 5 commands per 10 seconds per user
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 1000;
const userCommandTimestamps = new Map();

/**
 * Checks if a user has exceeded their command rate limit.
 * @param {string} senderId The user's ID
 * @returns {boolean} True if the user is rate-limited
 */
function isRateLimited(senderId) {
  const now = Date.now();
  const timestamps = userCommandTimestamps.get(senderId) || [];
  
  // Filter to only timestamps within the current window
  const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }
  
  recent.push(now);
  userCommandTimestamps.set(senderId, recent);
  
  // Clean up old entries periodically to prevent memory growth
  if (userCommandTimestamps.size > 1000) {
    for (const [id, tsList] of userCommandTimestamps) {
      const filtered = tsList.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
      if (filtered.length === 0) {
        userCommandTimestamps.delete(id);
      } else {
        userCommandTimestamps.set(id, filtered);
      }
    }
  }
  
  return false;
}

// Load commands
function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    delete require.cache[require.resolve(filePath)]; // Allow hot reloading
    const command = require(filePath);
    
    if ('name' in command && 'execute' in command) {
      commands.set(command.name, command);
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => commands.set(alias, command));
      }
    } else {
      console.warn(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property.`);
    }
  }
}

// Initial load
loadCommands();

async function handleMessage(api, senderId, threadId, messageText, sendMessageCallback) {
  if (!messageText || !messageText.startsWith(config.PREFIX)) {
    return; // Ignore non-commands
  }

  // Rate limiting: silently ignore users who are spamming commands
  if (isRateLimited(senderId)) {
    return;
  }

  const args = messageText.slice(config.PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = commands.get(commandName);

  if (!command) {
    // Command not found
    await sendMessageCallback(threadId, 'I dont recognise it, try /help to know every command');
    return;
  }

  // Admin Checks
  if (command.botAdminOnly) {
    if (!permissions.isBotAdmin(senderId)) {
      await sendMessageCallback(threadId, 'Permission denied: This command is restricted to Bot Admins only.');
      return;
    }
  } else if (command.adminOnly) {
    const isUserAdmin = await permissions.isAdmin(api, senderId, threadId);
    if (!isUserAdmin) {
      await sendMessageCallback(threadId, 'Permission denied: This command is restricted to Bot Admins and Group Admins.');
      return;
    }
  }

  try {
    // Pass api and threadId to command so it can reply in the group and perform api actions
    await command.execute(api, senderId, threadId, args, sendMessageCallback, commands, config);
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);
    await sendMessageCallback(threadId, 'There was an error trying to execute that command!');
  }
}

module.exports = {
  handleMessage,
  loadCommands,
  commands
};
