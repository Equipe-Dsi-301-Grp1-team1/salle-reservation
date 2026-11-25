const router = require('express').Router();
const bookingController = require('../controllers/bookingController');

router.get('/bookings/room/:roomId', bookingController.getRoom);

module.exports = router;
