const fs = require('fs');
const Setting = require('./src/config/setting');

module.exports = () => {
  if (!fs.existsSync(Setting.AVATAR_BASE_PATH)) fs.mkdirSync(Setting.AVATAR_BASE_PATH, { recursive: true });
  if (!fs.existsSync(Setting.UPLOAD_FILE_PATH)) fs.mkdirSync(Setting.UPLOAD_FILE_PATH, { recursive: true });
  if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
};
