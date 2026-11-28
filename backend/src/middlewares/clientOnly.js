const authJwt = require('./authJwt');

function clientOnly(req, res, next) {
  authJwt(req, res, () => {
    if (!req.user || req.user.role !== 'client') {
      return res.status(403).json({ message: 'Accès réservé aux clients.' });
    }
    next();
  });
}

module.exports = clientOnly;
