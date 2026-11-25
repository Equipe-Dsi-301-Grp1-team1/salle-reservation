const router = require('express').Router();
const receiptController = require('../controllers/receiptController');
const clientOnly = require('../middlewares/clientOnly');

router.get('/bookings/:id/receipt', clientOnly, receiptController.download);

module.exports = router;
