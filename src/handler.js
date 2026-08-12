const fs = require('fs');
const path = require('path');
const config = require('./config');
const permissions = require('./permissions');

const commands = new Map();

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
