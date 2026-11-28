const router = require('express').Router();
const agentBookingController = require('../controllers/agentBookingController');
const agentBookingAuth = require('../middlewares/agentBookingAuth');
const dashboardController = require('../controllers/dashboardController');

router.use(agentBookingAuth);

router.get('/dashboard', dashboardController.showApi);
router.get('/bookings', agentBookingController.list);
router.get('/bookings/:id', agentBookingController.detail);
router.post('/bookings/:id/validate', agentBookingController.validate);
router.post('/bookings/:id/reject', agentBookingController.reject);

module.exports = router;
