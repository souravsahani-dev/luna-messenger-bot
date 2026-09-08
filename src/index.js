const fs = require('fs');
const path = require('path');
const login = require('fca-riyad');
const config = require('./config');
const handler = require('./handler');

// Catch unhandled promise rejections so they don't crash the process silently
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled Rejection:', reason);
});

console.log(`Starting ${config.BOT_NAME}...`);

const appStatePath = path.resolve(__dirname, '..', config.APPSTATE_PATH);

if (!fs.existsSync(appStatePath)) {
  console.error(`[ERROR] Missing appstate file at ${appStatePath}`);
  console.error('Please create this file and populate it with your Facebook cookies (JSON format) to login.');
  process.exit(1);
}

let appState;
try {
  appState = JSON.parse(fs.readFileSync(appStatePath, 'utf8'));
} catch (err) {
  console.error(`[ERROR] Failed to parse ${appStatePath}:`, err.message);
  console.error('The file must be valid JSON. Please re-export your Facebook cookies and try again.');
  process.exit(1);
}

login({ appState }, (err, api) => {
  if (err) {
    console.error('[ERROR] Failed to login:', err);
    return;
  }

  console.log(`Logged in successfully! ${config.BOT_NAME} is now listening for messages...`);

  // Optionally set some options for the api
  api.setOptions({
    listenEvents: true,
    selfListen: false,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  api.listenMqtt(async (err, event) => {
    if (err) {
      console.error('[ERROR] Listening error:', err);
      return;
    }

    if (event.type === 'message' || event.type === 'message_reply') {
      const senderId = event.senderID;
      const threadId = event.threadID;
      const messageText = event.body;

      if (!messageText) return;

      // Log only metadata, not message content, to protect user privacy
      console.log(`Received message from ${senderId} in thread ${threadId} (${messageText.length} chars)`);

      // Callback function to send messages back using FCA
      const sendMessageCallback = async (targetId, text) => {
        return new Promise((resolve, reject) => {
          api.sendMessage(text, targetId, (err, messageInfo) => {
            if (err) return reject(err);
            resolve(messageInfo);
          });
        });
      };

      // Pass message to our command handler, passing threadId instead of senderId so the bot replies in the group
      await handler.handleMessage(api, senderId, threadId, messageText, sendMessageCallback);
    }
  });
});
