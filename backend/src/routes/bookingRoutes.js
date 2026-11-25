const router = require('express').Router();
const bookingController = require('../controllers/bookingController');
const clientOnly = require('../middlewares/clientOnly');

router.get('/bookings/room/:roomId', bookingController.getRoom);
router.post('/bookings', clientOnly, bookingController.create);

module.exports = router;
