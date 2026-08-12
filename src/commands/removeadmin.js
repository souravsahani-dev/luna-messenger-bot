const fs = require('fs');
const path = require('path');

const ADMINS_FILE = path.resolve(__dirname, '..', '..', 'admins.json');

module.exports = {
  name: 'removeadmin',
  description: 'Removes a Bot Admin dynamically by UID.',
  botAdminOnly: true,
  async execute(api, senderId, threadId, args, sendMessageCallback, commandsMap, config) {
    if (args.length === 0) {
      await sendMessageCallback(threadId, 'Usage: /removeadmin <uid>');
      return;
    }

    const uid = args[0];

    // Check if it's in the hardcoded .env
    if (config.ADMIN_IDS.includes(uid)) {
      await sendMessageCallback(threadId, `Cannot remove ${uid}: this UID is permanently hardcoded in the .env file.`);
      return;
    }

    try {
      let admins = [];
      if (fs.existsSync(ADMINS_FILE)) {
        admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
      }

      if (!admins.includes(uid)) {
        await sendMessageCallback(threadId, `${uid} is not a dynamically added Bot Admin.`);
        return;
      }

      admins = admins.filter(id => id !== uid);
      fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), 'utf8');

      await sendMessageCallback(threadId, `Successfully removed ${uid} from Bot Admins.`);
    } catch (err) {
      console.error('Error in removeadmin:', err);
      await sendMessageCallback(threadId, 'An error occurred while removing the admin.');
    }
  }
};
