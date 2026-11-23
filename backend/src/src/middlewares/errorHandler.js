const multer = require('multer');

module.exports = (err, req, res, next) => {
  let status = err.status || 400;
  let message = err.message;

  if (err instanceof multer.MulterError) {
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo trop lourde (2 Mo maximum)' : 'Envoi de photos impossible';
  } else if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map((e) => e.message).join(' ');
  } else if (!err.status && !err.expected) {
    console.error(err);
    status = 500;
    message = 'Erreur serveur. Réessayez plus tard.';
  }

  if (req.originalUrl.startsWith('/api')) return res.status(status).json({ erreur: message });
  res.status(status).render('error', { title: 'Une erreur est survenue', message });
};
