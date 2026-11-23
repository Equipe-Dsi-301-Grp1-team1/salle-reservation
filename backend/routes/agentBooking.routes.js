'use strict';
const router = require('express').Router();
const { body, query } = require('express-validator');
const validate = require('../middlewares/validate');
const objectId = require('../middlewares/objectId');
const { BOOKING_STATUS } = require('../utils/constants');
const c = require('../controllers/booking.controller');
const dashboard = require('../controllers/dashboard.controller');

router.get('/dashboard', dashboard.get);
router.get(
  '/bookings',
  [
    query('status').optional().isIn(Object.values(BOOKING_STATUS)).withMessage('Statut inconnu.'),
    query('room').optional().isMongoId().withMessage('Salle invalide.'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page invalide.').toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite invalide.').toInt(),
  ],
  validate,
  c.listForAgent,
);
router.get('/bookings/:id', objectId('id'), c.getForAgent);
router.post('/bookings/:id/validate', objectId('id'), c.validate);
router.post(
  '/bookings/:id/reject',
  objectId('id'),
  [body('reason').isString().trim().notEmpty().withMessage('Le motif du refus est obligatoire.').bail().isLength({ max: 500 }).withMessage('Le motif ne peut pas dépasser 500 caractères.')],
  validate,
  c.reject,
);

module.exports = router;
