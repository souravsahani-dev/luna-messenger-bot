module.exports = {
  name: 'help',
  description: 'Lists all available commands.',
  aliases: ['h'],
  async execute(api, senderId, threadId, args, sendMessageCallback, commandsMap, config) {
    let helpText = `Hello! I am ${config.BOT_NAME}. Here are the available commands:\n\n`;

    // Extract unique commands (ignore aliases for the display)
    const uniqueCommands = new Set();
    commandsMap.forEach(cmd => uniqueCommands.add(cmd));

    uniqueCommands.forEach(cmd => {
      helpText += `${config.PREFIX}${cmd.name} - ${cmd.description || 'No description provided.'}\n`;
    });

    await sendMessageCallback(threadId, helpText.trim());
  }
};
