const multer = require('multer');

const MAX_FILE_SIZE = 5 * 1024 * 1024; 
const MAX_PHOTOS = 5; 

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_PHOTOS },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(makeError('Format refusé : seuls les fichiers JPEG, PNG et WebP sont acceptés.'));
    }
    cb(null, true);
  },
});

function makeError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSignature.every((byte, i) => buffer[i] === byte)) {
    return { ext: '.png', mime: 'image/png' };
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: '.webp', mime: 'image/webp' };
  }
  return null;
}

function translateMulterError(error) {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return makeError('Photo trop lourde : 5 Mo maximum par fichier.');
  }
  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return makeError('Trop de photos : ' + MAX_PHOTOS + ' maximum par envoi.');
  }
  if (error.status) {
    return error;
  }
  return makeError("Erreur lors de l'envoi des photos.");
}

// Reçoit les fichiers du champ « photos », puis contrôle le contenu réel de chacun.
function uploadImages(req, res, next) {
  upload.array('photos', MAX_PHOTOS)(req, res, (error) => {
    if (error) {
      return next(translateMulterError(error));
    }

    const files = req.files || [];
    for (const file of files) {
      const type = detectImageType(file.buffer);
      if (!type) {
        return next(makeError('Fichier invalide : « ' + file.originalname + ' » n’est pas une vraie image JPEG, PNG ou WebP.'));
      }
      file.detectedExt = type.ext;
    }
    next();
  });
}

module.exports = { uploadImages, detectImageType, MAX_FILE_SIZE, MAX_PHOTOS };
