const router = require('express').Router();
const agentBookingController = require('../controllers/agentBookingController');
const agentBookingAuth = require('../middlewares/agentBookingAuth');

router.use(agentBookingAuth);

router.get('/bookings', agentBookingController.list);
router.get('/bookings/:id', agentBookingController.detail);
router.post('/bookings/:id/validate', agentBookingController.validate);

module.exports = router;
