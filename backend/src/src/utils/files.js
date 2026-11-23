const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../config');

function removeFile(urlOrName) {
  fs.unlink(path.join(UPLOAD_DIR, path.basename(urlOrName)), () => {});
}

module.exports = { removeFile };
