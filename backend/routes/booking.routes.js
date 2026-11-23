'use strict';
const router = require('express').Router();
const { body, query } = require('express-validator');
const validate = require('../middlewares/validate');
const objectId = require('../middlewares/objectId');
const dates = require('../utils/dates');
const { EVENT_TYPES, BOOKING_STATUS, LIMITS } = require('../utils/constants');
const c = require('../controllers/booking.controller');
const reviews = require('../controllers/review.controller');

router.post(
  '/',
  [
    body('roomId').isMongoId().withMessage('Salle invalide.'),
    body('date').custom((v) => dates.isValidDateString(v)).withMessage('La date est invalide.'),
    body('hours').isInt({ min: LIMITS.MIN_HOURS, max: LIMITS.MAX_HOURS }).withMessage('Le nombre d\'heures doit être compris entre 1 et 12.').toInt(),
    body('guests').isInt({ min: 1 }).withMessage("Le nombre d'invités doit être un entier supérieur à 0.").toInt(),
    body('eventType').isIn(EVENT_TYPES).withMessage("Choisissez un type d'événement."),
  ],
  validate,
  c.create,
);
router.get(
  '/me',
  [
    query('status').optional().isIn(Object.values(BOOKING_STATUS)).withMessage('Statut inconnu.'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page invalide.').toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite invalide.').toInt(),
  ],
  validate,
  c.listMine,
);
router.get('/:id', objectId('id'), c.getMine);
router.patch('/:id/cancel', objectId('id'), c.cancel);
router.post('/:id/pay', objectId('id'), c.pay);
router.get('/:id/receipt', objectId('id'), c.receipt);
router.post(
  '/:id/review',
  objectId('id'),
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('La note doit être comprise entre 1 et 5.').toInt(),
    body('comment').optional({ nullable: true }).isString().trim().isLength({ max: 500 }).withMessage('Le commentaire ne peut pas dépasser 500 caractères.'),
  ],
  validate,
  reviews.create,
);

module.exports = router;
