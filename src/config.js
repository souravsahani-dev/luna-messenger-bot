require('dotenv').config();

module.exports = {
  PREFIX: process.env.PREFIX || '/',
  BOT_NAME: process.env.BOT_NAME || 'Luna',
  APPSTATE_PATH: process.env.APPSTATE_PATH || 'appstate.json'
};
