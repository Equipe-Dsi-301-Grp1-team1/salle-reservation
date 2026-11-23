const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:4200',
  UPLOAD_DIR: path.join(__dirname, '..', 'public', 'uploads')
};
