const router = require('express').Router();
const agentBookingController = require('../controllers/agentBookingController');
const agentBookingAuth = require('../middlewares/agentBookingAuth');

router.use(agentBookingAuth);

router.get('/bookings', agentBookingController.list);

module.exports = router;
