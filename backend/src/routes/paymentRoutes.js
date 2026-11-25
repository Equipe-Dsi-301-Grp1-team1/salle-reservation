const router = require('express').Router();
const paymentController = require('../controllers/paymentController');
const clientOnly = require('../middlewares/clientOnly');

router.post('/payments/webhook', paymentController.webhook);
router.get('/payments/me', clientOnly, paymentController.history);
router.post('/bookings/:id/pay', clientOnly, paymentController.pay);
router.post('/bookings/:id/pay/demo', clientOnly, paymentController.payDemo);

module.exports = router;
