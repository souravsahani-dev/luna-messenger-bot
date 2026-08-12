const fs = require('fs');
const path = require('path');
const config = require('../config');

const ADMINS_FILE = path.resolve(__dirname, '..', '..', 'admins.json');

module.exports = {
  name: 'addadmin',
  description: 'Adds a new Bot Admin dynamically by UID.',
  botAdminOnly: true,
  async execute(api, senderId, threadId, args, sendMessageCallback, commandsMap, config) {
    if (args.length === 0) {
      await sendMessageCallback(threadId, 'Usage: /addadmin <uid>');
      return;
    }

    const uid = args[0];

    // Regex check for numeric string
    if (!/^\d+$/.test(uid)) {
      await sendMessageCallback(threadId, 'Invalid UID. UIDs must contain only numbers.');
      return;
    }

    try {
      let admins = [];
      if (fs.existsSync(ADMINS_FILE)) {
        admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
      }

      if (admins.includes(uid) || config.ADMIN_IDS.includes(uid)) {
        await sendMessageCallback(threadId, `${uid} is already a Bot Admin.`);
        return;
      }

      admins.push(uid);
      fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), 'utf8');

      await sendMessageCallback(threadId, `Successfully added ${uid} as a Bot Admin.`);
    } catch (err) {
      console.error('Error in addadmin:', err);
      await sendMessageCallback(threadId, 'An error occurred while adding the admin.');
    }
  }
};
