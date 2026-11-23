const { body, query } = require('express-validator');

const validateRoom = [
  body('name').trim()
    .notEmpty().withMessage('Veuillez saisir le nom de la salle')
    .isLength({ min: 3 }).withMessage('Le nom doit contenir 3 caractères ou plus'),
  body('description').trim(),
  body('address').trim().notEmpty().withMessage('Veuillez saisir l’adresse'),
  body('capacity').isInt({ min: 1 }).withMessage('La capacité doit être un nombre entier supérieur à 0').toInt(),
  body('pricePerHour').isFloat({ gt: 0 }).withMessage('Le prix par heure doit être supérieur à 0').toFloat()
];

const validateSearch = [
  query('q').optional().trim(),
  query('capacity').optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('Le nombre d’invités doit être un entier supérieur à 0').toInt(),
  query('maxPrice').optional({ values: 'falsy' })
    .isFloat({ gt: 0 }).withMessage('Le prix maximum doit être supérieur à 0').toFloat()
];

module.exports = { validateRoom, validateSearch };
